import { Router } from 'express'
import ClassStudent from '../models/ClassStudent.js'
import Exam from '../models/Exam.js'
import ExamMark from '../models/ExamMark.js'
import ExamSubject from '../models/ExamSubject.js'
import Student from '../models/Student.js'
import TeacherSubject from '../models/TeacherSubject.js'
import WhatsAppUsage from '../models/WhatsAppUsage.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'
import { withCollegeScope } from '../utils/tenant.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const asStringArray = (value) =>
  Array.isArray(value) ? value.map((item) => asTrimmedString(item)).filter(Boolean) : []

const getMaxRecipientsPerRequest = () => {
  const parsed = Number(process.env.WHATSAPP_MAX_RECIPIENTS_PER_REQUEST || 200)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 200
  }
  return Math.floor(parsed)
}

const getMonthlyWhatsAppSendCap = () => {
  const parsed = Number(process.env.WHATSAPP_MONTHLY_SEND_CAP || 20000)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 20000
  }
  return Math.floor(parsed)
}

const getCurrentUtcMonthKey = () => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const reserveMonthlyWhatsAppQuota = async (collegeId, batchSize, monthlyCap) => {
  if (batchSize <= 0) {
    return { allowed: true, remaining: monthlyCap }
  }
  if (batchSize > monthlyCap) {
    return { allowed: false, remaining: 0 }
  }

  const monthKey = getCurrentUtcMonthKey()
  let usage = await WhatsAppUsage.findOne({ collegeId, monthKey }).lean()

  if (!usage) {
    try {
      await WhatsAppUsage.create({ collegeId, monthKey, attemptedCount: 0 })
    } catch (error) {
      if (error?.code !== 11000) {
        throw error
      }
    }
    usage = await WhatsAppUsage.findOne({ collegeId, monthKey }).lean()
  }

  const threshold = monthlyCap - batchSize
  const updateResult = await WhatsAppUsage.updateOne(
    {
      collegeId,
      monthKey,
      attemptedCount: { $lte: threshold },
    },
    {
      $inc: {
        attemptedCount: batchSize,
      },
    },
  )

  if (!updateResult.modifiedCount) {
    const latestUsage = await WhatsAppUsage.findOne({ collegeId, monthKey }).lean()
    const attemptedCount = Number(latestUsage?.attemptedCount || 0)
    return {
      allowed: false,
      remaining: Math.max(0, monthlyCap - attemptedCount),
    }
  }

  const attemptedCount = Number(usage?.attemptedCount || 0) + batchSize
  return {
    allowed: true,
    remaining: Math.max(0, monthlyCap - attemptedCount),
  }
}

const getFirstConfiguredEnv = (...keys) => {
  for (const key of keys) {
    const value = asTrimmedString(process.env[key])
    if (value) {
      return value
    }
  }
  return ''
}

const normalizePhoneForWhatsApp = (rawPhone, defaultCountryCode) => {
  const trimmed = asTrimmedString(rawPhone)
  if (!trimmed) {
    return ''
  }

  const hadPlusPrefix = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) {
    return ''
  }

  if (hadPlusPrefix) {
    return digits
  }

  if (digits.length === 10) {
    const countryCodeDigits = defaultCountryCode.replace(/\D/g, '')
    return `${countryCodeDigits}${digits}`
  }

  return digits
}

const sendWhatsAppTextMessage = async ({
  phoneNumberId,
  accessToken,
  apiVersion,
  recipient,
  messageMode,
  message,
  templateName,
  templateLanguageCode,
}) => {
  const isTemplateMessage = messageMode === 'template'
  const requestBody = isTemplateMessage
    ? {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateLanguageCode,
          },
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: {
          body: message,
        },
      }

  const requestUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`
  // eslint-disable-next-line no-console
  console.log('Meta request', {
    url: requestUrl,
    mode: messageMode,
    to: recipient,
    type: requestBody.type,
    templateName: isTemplateMessage ? templateName : '',
    templateLanguageCode: isTemplateMessage ? templateLanguageCode : '',
    textLength: isTemplateMessage ? 0 : message.length,
  })

  let response
  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Meta network error', {
      url: requestUrl,
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  const payload = await response.json().catch(() => ({}))
  // eslint-disable-next-line no-console
  console.log('Meta response', {
    ok: response.ok,
    status: response.status,
    payload,
  })
  return { ok: response.ok, status: response.status, payload }
}

const getWhatsAppProviderError = (sendResult) => {
  const errorObject = sendResult?.payload?.error || {}
  const code =
    errorObject.code !== undefined && errorObject.code !== null
      ? `code ${errorObject.code}`
      : ''
  const subcode =
    errorObject.error_subcode !== undefined && errorObject.error_subcode !== null
      ? `subcode ${errorObject.error_subcode}`
      : ''
  const details = [code, subcode].filter(Boolean).join(', ')
  const baseMessage = errorObject.message || 'Failed to send message'

  if (details) {
    return `${baseMessage} (${details})`
  }

  return baseMessage
}

const getTeacherMappings = async (teacherId, collegeId) => {
  return TeacherSubject.find(withCollegeScope(collegeId, { teacher: teacherId }))
    .select({ className: 1, section: 1, subject: 1 })
    .lean()
}

const getAllowedStudentIdsForTeacher = async (teacherId, collegeId) => {
  const teacherMappings = await getTeacherMappings(teacherId, collegeId)
  const uniqueClassKeys = Array.from(
    new Set(teacherMappings.map((mapping) => `${mapping.className}__${mapping.section}`)),
  )
  if (!uniqueClassKeys.length) {
    return []
  }

  const classQuery = uniqueClassKeys.map((classKey) => {
    const [className, section] = classKey.split('__')
    return { className, section }
  })
  const classStudents = await ClassStudent.find(
    withCollegeScope(collegeId, {
      $or: classQuery,
    }),
  )
    .select({ student: 1 })
    .lean()

  return Array.from(new Set(classStudents.map((classStudent) => String(classStudent.student))))
}

const filterMarksForTeacher = async (teacherId, marks, collegeId) => {
  if (!marks.length) return []

  const teacherMappings = await getTeacherMappings(teacherId, collegeId)
  const allowedTriples = new Set(
    teacherMappings.map(
      (mapping) => `${mapping.className}__${mapping.section}__${mapping.subject}`,
    ),
  )
  if (!allowedTriples.size) return []

  const studentIds = Array.from(
    new Set(
      marks.map((mark) =>
        typeof mark.studentId === 'string' ? mark.studentId : String(mark.studentId?._id || ''),
      ),
    ),
  ).filter(Boolean)
  if (!studentIds.length) return []

  const classStudents = await ClassStudent.find(
    withCollegeScope(collegeId, {
      student: { $in: studentIds },
    }),
  )
    .select({ className: 1, section: 1, student: 1 })
    .lean()
  const classKeysByStudentId = new Map()
  for (const classStudent of classStudents) {
    const studentId = String(classStudent.student)
    const classKey = `${classStudent.className}__${classStudent.section}`
    const existing = classKeysByStudentId.get(studentId) || []
    existing.push(classKey)
    classKeysByStudentId.set(studentId, existing)
  }

  return marks.filter((mark) => {
    const studentId =
      typeof mark.studentId === 'string'
        ? mark.studentId
        : String(mark.studentId?._id || '')
    const subjectId =
      typeof mark.examSubjectId === 'string' ? '' : mark.examSubjectId?.subjectId || ''
    if (!studentId || !subjectId) return false

    const classKeys = classKeysByStudentId.get(studentId) || []
    return classKeys.some((classKey) => allowedTriples.has(`${classKey}__${subjectId}`))
  })
}

router.post('/whatsapp/parents', async (req, res) => {
  try {
    let studentIds = asStringArray(req.body?.studentIds)
    const message = asTrimmedString(req.body?.message)
    const maxRecipientsPerRequest = getMaxRecipientsPerRequest()
    const monthlyWhatsAppSendCap = getMonthlyWhatsAppSendCap()

    if (!studentIds.length) {
      return res.status(400).json({ message: 'At least one student must be selected' })
    }

    if (studentIds.length > maxRecipientsPerRequest) {
      return res.status(400).json({
        message: `Too many recipients at once. Maximum allowed is ${maxRecipientsPerRequest}.`,
      })
    }

    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    if (req.user.role === 'teacher') {
      const allowedStudentIds = new Set(
        await getAllowedStudentIdsForTeacher(req.user.id, req.user.collegeId),
      )
      studentIds = studentIds.filter((studentId) => allowedStudentIds.has(studentId))
      if (!studentIds.length) {
        return res.status(403).json({ message: 'You are not allowed to notify selected students' })
      }
    }

    const quotaReservation = await reserveMonthlyWhatsAppQuota(
      req.user.collegeId,
      studentIds.length,
      monthlyWhatsAppSendCap,
    )
    if (!quotaReservation.allowed) {
      return res.status(429).json({
        message: `Monthly WhatsApp send cap reached. Cap: ${monthlyWhatsAppSendCap}, remaining: ${quotaReservation.remaining}.`,
      })
    }

    const whatsappAccessToken = getFirstConfiguredEnv(
      'WHATSAPP_ACCESS_TOKEN',
      'META_ACCESS_TOKEN',
    )
    const whatsappPhoneNumberId = getFirstConfiguredEnv(
      'WHATSAPP_PHONE_NUMBER_ID',
      'META_PHONE_NUMBER_ID',
    )
    const whatsappApiVersion =
      getFirstConfiguredEnv('WHATSAPP_API_VERSION', 'META_API_VERSION') || 'v22.0'
    const whatsappMessageMode =
      getFirstConfiguredEnv('WHATSAPP_MESSAGE_MODE', 'META_MESSAGE_MODE') || 'text'
    const whatsappTemplateName =
      getFirstConfiguredEnv('WHATSAPP_TEMPLATE_NAME', 'META_TEMPLATE_NAME') ||
      'hello_world'
    const whatsappTemplateLanguageCode =
      getFirstConfiguredEnv('WHATSAPP_TEMPLATE_LANGUAGE_CODE', 'META_TEMPLATE_LANGUAGE_CODE') ||
      'en_US'
    const defaultCountryCode =
      asTrimmedString(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE) || '91'

    if (!whatsappAccessToken || !whatsappPhoneNumberId) {
      return res.status(400).json({
        message:
          'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.',
      })
    }

    const students = await Student.find(
      withCollegeScope(req.user.collegeId, { _id: { $in: studentIds } }),
    )
      .select({ name: 1, rollNo: 1, fatherPhone: 1 })
      .lean()
    const studentById = new Map(students.map((student) => [String(student._id), student]))

    const results = []
    let sentCount = 0

    // eslint-disable-next-line no-console
    console.log('WhatsApp parents route triggered', {
      totalStudents: studentIds.length,
      mode: whatsappMessageMode,
      apiVersion: whatsappApiVersion,
      rawMode: asTrimmedString(process.env.WHATSAPP_MESSAGE_MODE),
      rawMetaMode: asTrimmedString(process.env.META_MESSAGE_MODE),
    })

    for (const studentId of studentIds) {
      const student = studentById.get(studentId)
      if (!student) {
        results.push({
          studentId,
          studentName: '',
          studentRollNo: '',
          parentPhone: '',
          ok: false,
          error: 'Student not found',
        })
        continue
      }

      const normalizedPhone = normalizePhoneForWhatsApp(
        student.fatherPhone,
        defaultCountryCode,
      )

      if (!normalizedPhone) {
        results.push({
          studentId,
          studentName: student.name || '',
          studentRollNo: student.rollNo || '',
          parentPhone: student.fatherPhone || '',
          ok: false,
          error: 'Parent phone is invalid',
        })
        continue
      }

      const sendResult = await sendWhatsAppTextMessage({
        phoneNumberId: whatsappPhoneNumberId,
        accessToken: whatsappAccessToken,
        apiVersion: whatsappApiVersion,
        recipient: normalizedPhone,
        messageMode: whatsappMessageMode,
        message,
        templateName: whatsappTemplateName,
        templateLanguageCode: whatsappTemplateLanguageCode,
      })

      if (sendResult.ok) {
        sentCount += 1
        results.push({
          studentId,
          studentName: student.name || '',
          studentRollNo: student.rollNo || '',
          parentPhone: student.fatherPhone || '',
          ok: true,
          error: '',
        })
      } else {
        const providerError = getWhatsAppProviderError(sendResult)
        results.push({
          studentId,
          studentName: student.name || '',
          studentRollNo: student.rollNo || '',
          parentPhone: student.fatherPhone || '',
          ok: false,
          error: providerError,
        })
      }
    }

    return res.json({
      data: {
        total: studentIds.length,
        sent: sentCount,
        failed: studentIds.length - sentCount,
        results,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to send WhatsApp parent notifications', error)
    return res.status(500).json({ message: 'Failed to send WhatsApp notifications' })
  }
})

router.post('/whatsapp/marks', async (req, res) => {
  try {
    const examId = asTrimmedString(req.body?.examId)
    const examSubjectId = asTrimmedString(req.body?.examSubjectId)
    const selectedStudentIds = asStringArray(req.body?.studentIds)
    const additionalMessage = asTrimmedString(req.body?.additionalMessage)
    const maxRecipientsPerRequest = getMaxRecipientsPerRequest()
    const monthlyWhatsAppSendCap = getMonthlyWhatsAppSendCap()

    if (!examId) {
      return res.status(400).json({ message: 'Exam is required' })
    }

    if (selectedStudentIds.length > maxRecipientsPerRequest) {
      return res.status(400).json({
        message: `Too many recipients at once. Maximum allowed is ${maxRecipientsPerRequest}.`,
      })
    }

    const whatsappAccessToken = getFirstConfiguredEnv(
      'WHATSAPP_ACCESS_TOKEN',
      'META_ACCESS_TOKEN',
    )
    const whatsappPhoneNumberId = getFirstConfiguredEnv(
      'WHATSAPP_PHONE_NUMBER_ID',
      'META_PHONE_NUMBER_ID',
    )
    const whatsappApiVersion =
      getFirstConfiguredEnv('WHATSAPP_API_VERSION', 'META_API_VERSION') || 'v22.0'
    const whatsappMessageMode =
      getFirstConfiguredEnv('WHATSAPP_MESSAGE_MODE', 'META_MESSAGE_MODE') || 'text'
    const whatsappTemplateName =
      getFirstConfiguredEnv('WHATSAPP_TEMPLATE_NAME', 'META_TEMPLATE_NAME') ||
      'hello_world'
    const whatsappTemplateLanguageCode =
      getFirstConfiguredEnv('WHATSAPP_TEMPLATE_LANGUAGE_CODE', 'META_TEMPLATE_LANGUAGE_CODE') ||
      'en_US'
    const defaultCountryCode =
      asTrimmedString(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE) || '91'

    if (!whatsappAccessToken || !whatsappPhoneNumberId) {
      return res.status(400).json({
        message:
          'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.',
      })
    }

    const exam = await Exam.findOne(
      withCollegeScope(req.user.collegeId, { _id: examId }),
    ).lean()
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' })
    }

    if (examSubjectId) {
      const examSubject = await ExamSubject.findOne(
        withCollegeScope(req.user.collegeId, { _id: examSubjectId }),
      ).lean()
      if (!examSubject || String(examSubject.examId) !== String(examId)) {
        return res.status(400).json({ message: 'Invalid exam subject for selected exam' })
      }
    }

    const markQuery = withCollegeScope(req.user.collegeId, { examId })
    if (examSubjectId) {
      markQuery.examSubjectId = examSubjectId
    }
    if (selectedStudentIds.length) {
      markQuery.studentId = { $in: selectedStudentIds }
    }

    let marks = await ExamMark.find(markQuery)
      .populate('studentId', 'name rollNo fatherName fatherPhone')
      .populate('examSubjectId', 'subjectId totalMarks passingMarks')
      .sort({ updatedAt: -1 })
      .lean()

    if (req.user.role === 'teacher') {
      marks = await filterMarksForTeacher(req.user.id, marks, req.user.collegeId)
    }

    if (!marks.length) {
      return res.status(400).json({ message: 'No marks found for selected filters' })
    }

    const marksByStudentId = new Map()
    for (const mark of marks) {
      const student = mark.studentId
      const subject = mark.examSubjectId
      const studentId = typeof student === 'string' ? student : String(student?._id || '')
      if (!studentId) {
        continue
      }

      const current = marksByStudentId.get(studentId) || {
        studentId,
        studentName: typeof student === 'string' ? '' : student?.name || '',
        studentRollNo: typeof student === 'string' ? '' : student?.rollNo || '',
        fatherName: typeof student === 'string' ? '' : student?.fatherName || '',
        fatherPhone: typeof student === 'string' ? '' : student?.fatherPhone || '',
        marks: [],
      }
      current.marks.push({
        subjectId: typeof subject === 'string' ? '' : subject?.subjectId || '',
        totalMarks: typeof subject === 'string' ? 0 : Number(subject?.totalMarks || 0),
        passingMarks: typeof subject === 'string' ? 0 : Number(subject?.passingMarks || 0),
        marksObtained: Number(mark.marksObtained || 0),
      })
      marksByStudentId.set(studentId, current)
    }

    if (marksByStudentId.size > maxRecipientsPerRequest) {
      return res.status(400).json({
        message: `Too many recipients at once. Maximum allowed is ${maxRecipientsPerRequest}.`,
      })
    }

    const quotaReservation = await reserveMonthlyWhatsAppQuota(
      req.user.collegeId,
      marksByStudentId.size,
      monthlyWhatsAppSendCap,
    )
    if (!quotaReservation.allowed) {
      return res.status(429).json({
        message: `Monthly WhatsApp send cap reached. Cap: ${monthlyWhatsAppSendCap}, remaining: ${quotaReservation.remaining}.`,
      })
    }

    const examDisplayName = `${exam.examName} (${exam.academicYear})`
    const results = []
    let sentCount = 0

    // eslint-disable-next-line no-console
    console.log('WhatsApp marks route triggered', {
      recipients: marksByStudentId.size,
      mode: whatsappMessageMode,
      apiVersion: whatsappApiVersion,
      rawMode: asTrimmedString(process.env.WHATSAPP_MESSAGE_MODE),
      rawMetaMode: asTrimmedString(process.env.META_MESSAGE_MODE),
    })

    for (const [, studentEntry] of marksByStudentId) {
      const normalizedPhone = normalizePhoneForWhatsApp(
        studentEntry.fatherPhone,
        defaultCountryCode,
      )

      if (!normalizedPhone) {
        results.push({
          studentId: studentEntry.studentId,
          studentName: studentEntry.studentName,
          studentRollNo: studentEntry.studentRollNo,
          parentPhone: studentEntry.fatherPhone || '',
          ok: false,
          error: 'Parent phone is invalid',
        })
        continue
      }

      const marksLines = studentEntry.marks
        .map((item) => {
          const status = item.marksObtained >= item.passingMarks ? 'Pass' : 'Fail'
          return `${item.subjectId}: ${item.marksObtained}/${item.totalMarks} (${status})`
        })
        .join('\n')

      const message = [
        `Dear Parent,`,
        `Marks update for ${studentEntry.studentName} (${studentEntry.studentRollNo})`,
        `Exam: ${examDisplayName}`,
        '',
        ...(additionalMessage ? [additionalMessage, ''] : []),
        marksLines,
        '',
        `Regards,`,
        `School Admin`,
      ].join('\n')

      const sendResult = await sendWhatsAppTextMessage({
        phoneNumberId: whatsappPhoneNumberId,
        accessToken: whatsappAccessToken,
        apiVersion: whatsappApiVersion,
        recipient: normalizedPhone,
        messageMode: whatsappMessageMode,
        message,
        templateName: whatsappTemplateName,
        templateLanguageCode: whatsappTemplateLanguageCode,
      })

      if (sendResult.ok) {
        sentCount += 1
        results.push({
          studentId: studentEntry.studentId,
          studentName: studentEntry.studentName,
          studentRollNo: studentEntry.studentRollNo,
          parentPhone: studentEntry.fatherPhone || '',
          ok: true,
          error: '',
        })
      } else {
        const providerError = getWhatsAppProviderError(sendResult)
        results.push({
          studentId: studentEntry.studentId,
          studentName: studentEntry.studentName,
          studentRollNo: studentEntry.studentRollNo,
          parentPhone: studentEntry.fatherPhone || '',
          ok: false,
          error: providerError,
        })
      }
    }

    return res.json({
      data: {
        total: marksByStudentId.size,
        sent: sentCount,
        failed: marksByStudentId.size - sentCount,
        results,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to send WhatsApp marks notifications', error)
    return res.status(500).json({ message: 'Failed to send marks notifications' })
  }
})

export default router

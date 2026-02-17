import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import ClassStudentManagementPage from './pages/ClassStudentManagementPage'
import ClassSubjectManagementPage from './pages/ClassSubjectManagementPage'
import MarksManagementPage from './pages/MarksManagementPage'
import NotificationsPage from './pages/NotificationsPage'
import SubjectManagementPage from './pages/SubjectManagementPage'
import LoginPage from './pages/LoginPage'
import TeacherManagementPage from './pages/TeacherManagementPage'
import TeacherSubjectManagementPage from './pages/TeacherSubjectManagementPage'

type Student = {
  _id: string
  name: string
  rollNo: string
  fatherName: string
  studentPhone: string
  fatherPhone: string
}

type StudentFormState = Omit<Student, '_id'>

type ExamClass = {
  classId: string
  sectionId: string
}

type Exam = {
  _id: string
  examClasses: ExamClass[]
  examName: string
  classId: string
  sectionId: string
  academicYear: string
  description: string
  status: 'draft' | 'published' | 'completed'
  createdAt: string
}

type ExamFormState = {
  examName: string
  examClassKeys: string[]
  academicYear: string
  description: string
  status: 'draft' | 'published' | 'completed'
}

type NormalizedExamFormState = {
  examName: string
  examClasses: ExamClass[]
  classId: string
  sectionId: string
  academicYear: string
  description: string
  status: 'draft' | 'published' | 'completed'
}

type ExamSubject = {
  _id: string
  examId: string
  subjectId: string
  examDate: string
  totalMarks: number
  passingMarks: number
  instructions: string
}

type ExamSubjectFormState = {
  subjectId: string
  examDate: string
  totalMarks: string
  passingMarks: string
  instructions: string
}

type Subject = {
  _id: string
  name: string
}

type SubjectFormState = Omit<Subject, '_id'>

type Teacher = {
  _id: string
  name: string
  email: string
  phone: string
}

type TeacherFormState = Omit<Teacher, '_id'> & {
  password: string
}

type AuthUser = {
  id: string
  role: 'admin' | 'teacher'
  name: string
  email: string
}

type TeacherSubject = {
  _id: string
  className: string
  section: string
  subject: string
  teacher: string
  teacherName: string
}

type TeacherSubjectFormState = {
  className: string
  section: string
  subject: string
  teacher: string
}

type ClassSubject = {
  _id: string
  className: string
  section: string
  subject: string
}

type ClassSubjectFormState = Omit<ClassSubject, '_id'>

type ClassStudent = {
  _id: string
  className: string
  section: string
  student: string
  studentName: string
  studentRollNo: string
}

type ClassStudentFormState = {
  className: string
  section: string
  student: string
}

type ClassRecord = {
  _id: string
  className: string
  section: string
}

type ClassFormState = Omit<ClassRecord, '_id'>

const initialStudentFormState: StudentFormState = {
  name: '',
  rollNo: '',
  fatherName: '',
  studentPhone: '',
  fatherPhone: '',
}

const initialExamFormState: ExamFormState = {
  examName: '',
  examClassKeys: [],
  academicYear: '',
  description: '',
  status: 'draft',
}

const initialExamSubjectFormState: ExamSubjectFormState = {
  subjectId: '',
  examDate: '',
  totalMarks: '',
  passingMarks: '',
  instructions: '',
}

const initialSubjectFormState: SubjectFormState = {
  name: '',
}

const initialTeacherFormState: TeacherFormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
}

const initialTeacherSubjectFormState: TeacherSubjectFormState = {
  className: '',
  section: '',
  subject: '',
  teacher: '',
}

const initialClassSubjectFormState: ClassSubjectFormState = {
  className: '',
  section: '',
  subject: '',
}

const initialClassStudentFormState: ClassStudentFormState = {
  className: '',
  section: '',
  student: '',
}

const initialClassFormState: ClassFormState = {
  className: '',
  section: '',
}

const studentApiPath = '/api/students'
const examApiPath = '/api/exams'
const examSubjectApiPath = '/api/exam-subjects'
const subjectApiPath = '/api/subjects'
const teacherApiPath = '/api/teachers'
const teacherSubjectApiPath = '/api/teacher-subjects'
const classApiPath = '/api/classes'
const classSubjectApiPath = '/api/class-subjects'
const classStudentApiPath = '/api/class-students'
const phoneRegex = /^\d{10,15}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const classKeySeparator = '__'
const authTokenStorageKey = 'authToken'
const authUserStorageKey = 'authUser'

const getClassKey = (classId: string, sectionId: string): string =>
  `${classId}${classKeySeparator}${sectionId}`

const parseClassKey = (classKey: string): ExamClass => {
  const [classId = '', sectionId = ''] = classKey.split(classKeySeparator)
  return { classId, sectionId }
}

const normalizeStudentForm = (form: StudentFormState): StudentFormState => {
  return {
    name: form.name.trim(),
    rollNo: form.rollNo.trim(),
    fatherName: form.fatherName.trim(),
    studentPhone: form.studentPhone.trim(),
    fatherPhone: form.fatherPhone.trim(),
  }
}

const validateStudentForm = (form: StudentFormState): string | null => {
  if (!form.name) return 'Name is required'
  if (!form.rollNo) return 'Roll No is required'
  if (!form.fatherName) return 'Father Name is required'
  if (!form.studentPhone) return 'Student Phone is required'
  if (!form.fatherPhone) return 'Father Phone is required'
  if (!phoneRegex.test(form.studentPhone)) {
    return 'Student Phone must be 10 to 15 digits'
  }
  if (!phoneRegex.test(form.fatherPhone)) {
    return 'Father Phone must be 10 to 15 digits'
  }
  return null
}

const normalizeExamForm = (form: ExamFormState): NormalizedExamFormState => {
  const normalizedExamClasses = form.examClassKeys
    .map((classKey) => parseClassKey(classKey))
    .map((examClass) => ({
      classId: examClass.classId.trim(),
      sectionId: examClass.sectionId.trim(),
    }))
    .filter((examClass) => examClass.classId && examClass.sectionId)

  const uniqueExamClasses = normalizedExamClasses.filter((examClass, index, self) => {
    return (
      self.findIndex(
        (candidate) =>
          candidate.classId === examClass.classId && candidate.sectionId === examClass.sectionId,
      ) === index
    )
  })

  const primaryClass = uniqueExamClasses[0] || { classId: '', sectionId: '' }
  return {
    examName: form.examName.trim(),
    examClasses: uniqueExamClasses,
    classId: primaryClass.classId,
    sectionId: primaryClass.sectionId,
    academicYear: form.academicYear.trim(),
    description: form.description.trim(),
    status: form.status,
  }
}

const validateExamForm = (form: NormalizedExamFormState): string | null => {
  if (!form.examName) return 'Exam Name is required'
  if (!form.examClasses.length) return 'At least one Class-Section is required'
  if (!form.academicYear) return 'Academic Year is required'
  if (!['draft', 'published', 'completed'].includes(form.status)) {
    return 'Status is invalid'
  }
  return null
}

const normalizeExamSubjectForm = (
  form: ExamSubjectFormState,
): ExamSubjectFormState => {
  return {
    subjectId: form.subjectId.trim(),
    examDate: form.examDate,
    totalMarks: form.totalMarks.trim(),
    passingMarks: form.passingMarks.trim(),
    instructions: form.instructions.trim(),
  }
}

const validateExamSubjectForm = (form: ExamSubjectFormState): string | null => {
  if (!form.subjectId) return 'Subject is required'
  if (!form.examDate) return 'Exam Date is required'

  const totalMarks = Number(form.totalMarks)
  if (!Number.isFinite(totalMarks)) return 'Maximum Marks must be a number'
  if (!Number.isInteger(totalMarks) || totalMarks < 1) {
    return 'Maximum Marks must be a whole number greater than 0'
  }

  const passingMarks = Number(form.passingMarks)
  if (!Number.isFinite(passingMarks)) return 'Passing Marks must be a number'
  if (!Number.isInteger(passingMarks) || passingMarks < 0) {
    return 'Passing Marks must be a whole number 0 or greater'
  }
  if (passingMarks > totalMarks) {
    return 'Passing Marks cannot be greater than Maximum Marks'
  }
  return null
}

const normalizeSubjectForm = (form: SubjectFormState): SubjectFormState => {
  return {
    name: form.name.trim(),
  }
}

const validateSubjectForm = (form: SubjectFormState): string | null => {
  if (!form.name) return 'Subject Name is required'
  return null
}

const normalizeTeacherForm = (form: TeacherFormState): TeacherFormState => {
  return {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    password: form.password.trim(),
  }
}

const validateTeacherForm = (
  form: TeacherFormState,
  requirePassword: boolean,
): string | null => {
  if (!form.name) return 'Name is required'
  if (!form.email) return 'Email is required'
  if (!emailRegex.test(form.email)) return 'Email is invalid'
  if (!form.phone) return 'Phone is required'
  if (!phoneRegex.test(form.phone)) return 'Phone must be 10 to 15 digits'
  if (requirePassword && !form.password) return 'Password is required'
  if (form.password && form.password.length < 6) {
    return 'Password must be at least 6 characters'
  }
  return null
}

const normalizeTeacherSubjectForm = (
  form: TeacherSubjectFormState,
): TeacherSubjectFormState => {
  return {
    className: form.className.trim(),
    section: form.section.trim(),
    subject: form.subject.trim(),
    teacher: form.teacher.trim(),
  }
}

const validateTeacherSubjectForm = (
  form: TeacherSubjectFormState,
): string | null => {
  if (!form.className) return 'Class is required'
  if (!form.section) return 'Section is required'
  if (!form.subject) return 'Subject is required'
  if (!form.teacher) return 'Teacher is required'
  return null
}

const normalizeClassSubjectForm = (
  form: ClassSubjectFormState,
): ClassSubjectFormState => {
  return {
    className: form.className.trim(),
    section: form.section.trim(),
    subject: form.subject.trim(),
  }
}

const validateClassSubjectForm = (form: ClassSubjectFormState): string | null => {
  if (!form.className) return 'Class is required'
  if (!form.section) return 'Section is required'
  if (!form.subject) return 'Subject is required'
  return null
}

const normalizeClassStudentForm = (
  form: ClassStudentFormState,
): ClassStudentFormState => {
  return {
    className: form.className.trim(),
    section: form.section.trim(),
    student: form.student.trim(),
  }
}

const validateClassStudentForm = (form: ClassStudentFormState): string | null => {
  if (!form.className) return 'Class is required'
  if (!form.section) return 'Section is required'
  if (!form.student) return 'Student is required'
  return null
}

const normalizeClassForm = (form: ClassFormState): ClassFormState => {
  return {
    className: form.className.trim(),
    section: form.section.trim(),
  }
}

const validateClassForm = (form: ClassFormState): string | null => {
  if (!form.className) return 'Class is required'
  if (!form.section) return 'Section is required'
  return null
}

function App() {
  const [authReady, setAuthReady] = useState(false)
  const [authToken, setAuthToken] = useState('')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

  const [activePage, setActivePage] = useState<
    | 'students'
    | 'exams'
    | 'subjects'
    | 'teachers'
    | 'teacherSubjects'
    | 'marks'
    | 'classSubjects'
    | 'classStudents'
    | 'classes'
    | 'notifications'
  >('students')

  const [students, setStudents] = useState<Student[]>([])
  const [studentForm, setStudentForm] = useState<StudentFormState>(
    initialStudentFormState,
  )
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [studentLoading, setStudentLoading] = useState(false)
  const [studentSubmitting, setStudentSubmitting] = useState(false)

  const [exams, setExams] = useState<Exam[]>([])
  const [examForm, setExamForm] = useState<ExamFormState>(initialExamFormState)
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([])
  const [examSubjectForm, setExamSubjectForm] = useState<ExamSubjectFormState>(
    initialExamSubjectFormState,
  )
  const [examSubjectCountByExam, setExamSubjectCountByExam] = useState<
    Record<string, number>
  >({})
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [editingExamSubjectId, setEditingExamSubjectId] = useState<string | null>(
    null,
  )
  const [examSearch, setExamSearch] = useState('')
  const [examFilterClassKey, setExamFilterClassKey] = useState('')
  const [examFilterYear, setExamFilterYear] = useState('')
  const [examFilterStatus, setExamFilterStatus] = useState('')
  const [examLoading, setExamLoading] = useState(false)
  const [examSubmitting, setExamSubmitting] = useState(false)
  const [examSubjectsLoading, setExamSubjectsLoading] = useState(false)
  const [examSubjectSubmitting, setExamSubjectSubmitting] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>(
    initialSubjectFormState,
  )
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [subjectLoading, setSubjectLoading] = useState(false)
  const [subjectSubmitting, setSubjectSubmitting] = useState(false)

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>(
    initialTeacherFormState,
  )
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherLoading, setTeacherLoading] = useState(false)
  const [teacherSubmitting, setTeacherSubmitting] = useState(false)

  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([])
  const [teacherSubjectForm, setTeacherSubjectForm] =
    useState<TeacherSubjectFormState>(initialTeacherSubjectFormState)
  const [editingTeacherSubjectId, setEditingTeacherSubjectId] = useState<
    string | null
  >(null)
  const [teacherSubjectSearch, setTeacherSubjectSearch] = useState('')
  const [teacherSubjectLoading, setTeacherSubjectLoading] = useState(false)
  const [teacherSubjectSubmitting, setTeacherSubjectSubmitting] = useState(false)

  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [classSubjectForm, setClassSubjectForm] = useState<ClassSubjectFormState>(
    initialClassSubjectFormState,
  )
  const [editingClassSubjectId, setEditingClassSubjectId] = useState<
    string | null
  >(null)
  const [classSubjectSearch, setClassSubjectSearch] = useState('')
  const [classSubjectLoading, setClassSubjectLoading] = useState(false)
  const [classSubjectSubmitting, setClassSubjectSubmitting] = useState(false)

  const [classStudents, setClassStudents] = useState<ClassStudent[]>([])
  const [classStudentForm, setClassStudentForm] = useState<ClassStudentFormState>(
    initialClassStudentFormState,
  )
  const [editingClassStudentId, setEditingClassStudentId] = useState<
    string | null
  >(null)
  const [classStudentSearch, setClassStudentSearch] = useState('')
  const [classStudentLoading, setClassStudentLoading] = useState(false)
  const [classStudentSubmitting, setClassStudentSubmitting] = useState(false)

  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [classForm, setClassForm] = useState<ClassFormState>(initialClassFormState)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [classSearch, setClassSearch] = useState('')
  const [classLoading, setClassLoading] = useState(false)
  const [classSubmitting, setClassSubmitting] = useState(false)

  const [error, setError] = useState('')
  const isTeacherUser = authUser?.role === 'teacher'

  const isEditingStudent = useMemo(
    () => Boolean(editingStudentId),
    [editingStudentId],
  )
  const isEditingExam = useMemo(() => Boolean(editingExamId), [editingExamId])
  const isEditingExamSubject = useMemo(
    () => Boolean(editingExamSubjectId),
    [editingExamSubjectId],
  )
  const isEditingSubject = useMemo(
    () => Boolean(editingSubjectId),
    [editingSubjectId],
  )
  const isEditingTeacher = useMemo(
    () => Boolean(editingTeacherId),
    [editingTeacherId],
  )
  const isEditingTeacherSubject = useMemo(
    () => Boolean(editingTeacherSubjectId),
    [editingTeacherSubjectId],
  )
  const isEditingClassSubject = useMemo(
    () => Boolean(editingClassSubjectId),
    [editingClassSubjectId],
  )
  const isEditingClassStudent = useMemo(
    () => Boolean(editingClassStudentId),
    [editingClassStudentId],
  )
  const isEditingClass = useMemo(() => Boolean(editingClassId), [editingClassId])

  const filteredStudents = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return students
    }

    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(normalizedSearch) ||
        student.rollNo.toLowerCase().includes(normalizedSearch) ||
        student.fatherName.toLowerCase().includes(normalizedSearch) ||
        student.studentPhone.toLowerCase().includes(normalizedSearch) ||
        student.fatherPhone.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [studentSearch, students])

  const filteredExams = useMemo(() => {
    const normalizedSearch = examSearch.trim().toLowerCase()
    return exams.filter((exam) => {
      const examClassKeys = (exam.examClasses || []).map((examClass) =>
        getClassKey(examClass.classId, examClass.sectionId),
      )
      const matchesClass =
        !examFilterClassKey ||
        examClassKeys.includes(examFilterClassKey) ||
        getClassKey(exam.classId, exam.sectionId) === examFilterClassKey
      const matchesYear = !examFilterYear || exam.academicYear === examFilterYear
      const matchesStatus = !examFilterStatus || exam.status === examFilterStatus
      const examClassLabel = examClassKeys.join(' ')
      const searchBlob =
        `${exam.examName} ${exam.classId} ${exam.sectionId} ${examClassLabel} ${exam.academicYear} ${exam.status}`.toLowerCase()
      const matchesSearch = !normalizedSearch || searchBlob.includes(normalizedSearch)

      return matchesClass && matchesYear && matchesStatus && matchesSearch
    })
  }, [examFilterClassKey, examFilterStatus, examFilterYear, examSearch, exams])

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = subjectSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return subjects
    }

    return subjects.filter((subject) => {
      return subject.name.toLowerCase().includes(normalizedSearch)
    })
  }, [subjectSearch, subjects])

  const filteredTeachers = useMemo(() => {
    const normalizedSearch = teacherSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return teachers
    }

    return teachers.filter((teacher) => {
      return (
        teacher.name.toLowerCase().includes(normalizedSearch) ||
        teacher.email.toLowerCase().includes(normalizedSearch) ||
        teacher.phone.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [teacherSearch, teachers])

  const filteredTeacherSubjects = useMemo(() => {
    const normalizedSearch = teacherSubjectSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return teacherSubjects
    }

    return teacherSubjects.filter((teacherSubject) => {
      return (
        teacherSubject.className.toLowerCase().includes(normalizedSearch) ||
        teacherSubject.section.toLowerCase().includes(normalizedSearch) ||
        teacherSubject.subject.toLowerCase().includes(normalizedSearch) ||
        teacherSubject.teacherName.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [teacherSubjectSearch, teacherSubjects])

  const filteredClassSubjects = useMemo(() => {
    const normalizedSearch = classSubjectSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return classSubjects
    }

    return classSubjects.filter((classSubject) => {
      return (
        classSubject.className.toLowerCase().includes(normalizedSearch) ||
        classSubject.section.toLowerCase().includes(normalizedSearch) ||
        classSubject.subject.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [classSubjectSearch, classSubjects])

  const filteredClasses = useMemo(() => {
    const normalizedSearch = classSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return classes
    }

    return classes.filter((classRecord) => {
      return (
        classRecord.className.toLowerCase().includes(normalizedSearch) ||
        classRecord.section.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [classSearch, classes])

  const filteredClassStudents = useMemo(() => {
    const normalizedSearch = classStudentSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return classStudents
    }

    return classStudents.filter((classStudent) => {
      return (
        classStudent.className.toLowerCase().includes(normalizedSearch) ||
        classStudent.section.toLowerCase().includes(normalizedSearch) ||
        classStudent.studentName.toLowerCase().includes(normalizedSearch) ||
        classStudent.studentRollNo.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [classStudentSearch, classStudents])

  const selectedExam = useMemo(
    () => exams.find((exam) => exam._id === selectedExamId) || null,
    [exams, selectedExamId],
  )

  const examAcademicYearOptions = useMemo(() => {
    const years = exams.map((exam) => exam.academicYear).filter(Boolean)
    return Array.from(new Set(years)).sort((a, b) => a.localeCompare(b))
  }, [exams])

  const examSubjectOptions = useMemo(() => {
    if (!selectedExam) {
      return []
    }

    const examClassKeys = new Set(
      (selectedExam.examClasses || []).map((examClass) =>
        getClassKey(examClass.classId, examClass.sectionId),
      ),
    )
    if (!examClassKeys.size && selectedExam.classId && selectedExam.sectionId) {
      examClassKeys.add(getClassKey(selectedExam.classId, selectedExam.sectionId))
    }

    const names = classSubjects
      .filter(
        (classSubject) =>
          examClassKeys.has(getClassKey(classSubject.className, classSubject.section)),
      )
      .map((classSubject) => classSubject.subject.trim())
      .filter(Boolean)

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [classSubjects, selectedExam])

  const loadStudents = async () => {
    try {
      setStudentLoading(true)
      setError('')

      const response = await fetch(studentApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load students')
      }

      const normalizedStudents = (payload.data || []).map(
        (student: Student & { parentDetails?: string; parentPhone?: string }) => ({
          ...student,
          fatherName: student.fatherName || student.parentDetails || '',
          fatherPhone: student.fatherPhone || student.parentPhone || '',
        }),
      )
      setStudents(normalizedStudents)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setStudentLoading(false)
    }
  }

  const loadExams = async () => {
    try {
      setExamLoading(true)
      setError('')

      const response = await fetch(examApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load exams')
      }

      const loadedExams = payload.data || []
      setExams(loadedExams)
      setSelectedExamId((previousExamId) => {
        if (!loadedExams.length) {
          return null
        }
        if (previousExamId && loadedExams.some((exam: Exam) => exam._id === previousExamId)) {
          return previousExamId
        }
        return loadedExams[0]._id
      })

      const countEntries = await Promise.all(
        loadedExams.map(async (exam: Exam) => {
          try {
            const countResponse = await fetch(`${examSubjectApiPath}/exam/${exam._id}`)
            const countPayload = await countResponse.json()
            if (!countResponse.ok) {
              return [exam._id, 0]
            }
            const count = Array.isArray(countPayload.data) ? countPayload.data.length : 0
            return [exam._id, count]
          } catch (_error) {
            return [exam._id, 0]
          }
        }),
      )
      setExamSubjectCountByExam(Object.fromEntries(countEntries))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setExamLoading(false)
    }
  }

  const loadExamSubjects = async (examId: string) => {
    try {
      setExamSubjectsLoading(true)
      setError('')

      const response = await fetch(`${examSubjectApiPath}/exam/${examId}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load exam subjects')
      }

      const loadedExamSubjects = payload.data || []
      setExamSubjects(loadedExamSubjects)
      setExamSubjectCountByExam((previousCounts) => ({
        ...previousCounts,
        [examId]: loadedExamSubjects.length,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setExamSubjectsLoading(false)
    }
  }

  const loadSubjects = async () => {
    try {
      setSubjectLoading(true)
      setError('')

      const response = await fetch(subjectApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load subjects')
      }

      setSubjects(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setSubjectLoading(false)
    }
  }

  const loadTeachers = async () => {
    try {
      setTeacherLoading(true)
      setError('')

      const response = await fetch(teacherApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load teachers')
      }

      setTeachers(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setTeacherLoading(false)
    }
  }

  const loadTeacherSubjects = async () => {
    try {
      setTeacherSubjectLoading(true)
      setError('')

      const response = await fetch(teacherSubjectApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load teacher-subject mappings')
      }

      setTeacherSubjects(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setTeacherSubjectLoading(false)
    }
  }

  const loadClassSubjects = async () => {
    try {
      setClassSubjectLoading(true)
      setError('')

      const response = await fetch(classSubjectApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load class-subject mappings')
      }

      setClassSubjects(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setClassSubjectLoading(false)
    }
  }

  const loadClassStudents = async () => {
    try {
      setClassStudentLoading(true)
      setError('')

      const response = await fetch(classStudentApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load class-student mappings')
      }

      setClassStudents(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setClassStudentLoading(false)
    }
  }

  const loadClasses = async () => {
    try {
      setClassLoading(true)
      setError('')

      const response = await fetch(classApiPath)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load classes')
      }

      setClasses(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setClassLoading(false)
    }
  }

  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem(authTokenStorageKey) || ''
      const savedUserRaw = localStorage.getItem(authUserStorageKey)

      if (!savedToken || !savedUserRaw) {
        setAuthReady(true)
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.message || 'Session expired')
        }

        const user = payload.data as AuthUser
        setAuthToken(savedToken)
        setAuthUser(user)
        if (user.role === 'teacher') {
          setActivePage('marks')
        }
      } catch (_error) {
        localStorage.removeItem(authTokenStorageKey)
        localStorage.removeItem(authUserStorageKey)
      } finally {
        setAuthReady(true)
      }
    }

    void restoreSession()
  }, [])

  useEffect(() => {
    if (!authToken) {
      return
    }
    void Promise.all([
      loadStudents(),
      loadExams(),
      loadSubjects(),
      loadTeachers(),
      loadTeacherSubjects(),
      loadClassSubjects(),
      loadClassStudents(),
      loadClasses(),
    ])
  }, [authToken])

  useEffect(() => {
    if (!selectedExamId) {
      setExamSubjects([])
      return
    }
    void loadExamSubjects(selectedExamId)
  }, [selectedExamId])

  const resetStudentForm = () => {
    setStudentForm(initialStudentFormState)
    setEditingStudentId(null)
  }

  const resetExamForm = () => {
    setExamForm(initialExamFormState)
    setEditingExamId(null)
  }

  const handleExamClassSelection = (classKey: string, checked: boolean) => {
    setExamForm((previous) => {
      if (checked) {
        const nextClassKeys = new Set([...previous.examClassKeys, classKey])
        return { ...previous, examClassKeys: Array.from(nextClassKeys) }
      }
      return {
        ...previous,
        examClassKeys: previous.examClassKeys.filter((existingKey) => existingKey !== classKey),
      }
    })
  }

  const selectAllExamClasses = () => {
    setExamForm((previous) => ({
      ...previous,
      examClassKeys: classes.map((classRecord) =>
        getClassKey(classRecord.className, classRecord.section),
      ),
    }))
  }

  const clearExamClasses = () => {
    setExamForm((previous) => ({ ...previous, examClassKeys: [] }))
  }

  const resetExamSubjectForm = () => {
    setExamSubjectForm(initialExamSubjectFormState)
    setEditingExamSubjectId(null)
  }

  const resetSubjectForm = () => {
    setSubjectForm(initialSubjectFormState)
    setEditingSubjectId(null)
  }

  const resetTeacherForm = () => {
    setTeacherForm(initialTeacherFormState)
    setEditingTeacherId(null)
  }

  const resetTeacherSubjectForm = () => {
    setTeacherSubjectForm(initialTeacherSubjectFormState)
    setEditingTeacherSubjectId(null)
  }

  const resetClassSubjectForm = () => {
    setClassSubjectForm(initialClassSubjectFormState)
    setEditingClassSubjectId(null)
  }

  const resetClassStudentForm = () => {
    setClassStudentForm(initialClassStudentFormState)
    setEditingClassStudentId(null)
  }

  const resetClassForm = () => {
    setClassForm(initialClassFormState)
    setEditingClassId(null)
  }

  const handleStudentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setStudentSubmitting(true)
      setError('')
      const normalizedStudentForm = normalizeStudentForm(studentForm)
      const validationError = validateStudentForm(normalizedStudentForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingStudent ? 'PUT' : 'POST'
      const url = isEditingStudent
        ? `${studentApiPath}/${editingStudentId}`
        : studentApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedStudentForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save student')
      }

      resetStudentForm()
      await loadStudents()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setStudentSubmitting(false)
    }
  }

  const handleExamSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setExamSubmitting(true)
      setError('')
      const normalizedExamForm = normalizeExamForm(examForm)
      const validationError = validateExamForm(normalizedExamForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingExam ? 'PUT' : 'POST'
      const url = isEditingExam ? `${examApiPath}/${editingExamId}` : examApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedExamForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save exam')
      }

      resetExamForm()
      await loadExams()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setExamSubmitting(false)
    }
  }

  const handleExamSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedExamId) {
      setError('Select an exam first to manage subjects')
      return
    }

    try {
      setExamSubjectSubmitting(true)
      setError('')
      const normalizedExamSubjectForm = normalizeExamSubjectForm(examSubjectForm)
      const validationError = validateExamSubjectForm(normalizedExamSubjectForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingExamSubject ? 'PUT' : 'POST'
      const url = isEditingExamSubject
        ? `${examSubjectApiPath}/${editingExamSubjectId}`
        : examSubjectApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          ...normalizedExamSubjectForm,
          totalMarks: Number(normalizedExamSubjectForm.totalMarks),
          passingMarks: Number(normalizedExamSubjectForm.passingMarks),
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save exam subject')
      }

      resetExamSubjectForm()
      await loadExamSubjects(selectedExamId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setExamSubjectSubmitting(false)
    }
  }

  const handleSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubjectSubmitting(true)
      setError('')
      const normalizedSubjectForm = normalizeSubjectForm(subjectForm)
      const validationError = validateSubjectForm(normalizedSubjectForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingSubject ? 'PUT' : 'POST'
      const url = isEditingSubject
        ? `${subjectApiPath}/${editingSubjectId}`
        : subjectApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedSubjectForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save subject')
      }

      resetSubjectForm()
      await loadSubjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setSubjectSubmitting(false)
    }
  }

  const handleTeacherSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setTeacherSubmitting(true)
      setError('')
      const normalizedTeacherForm = normalizeTeacherForm(teacherForm)
      const validationError = validateTeacherForm(
        normalizedTeacherForm,
        !isEditingTeacher,
      )
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingTeacher ? 'PUT' : 'POST'
      const url = isEditingTeacher
        ? `${teacherApiPath}/${editingTeacherId}`
        : teacherApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedTeacherForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save teacher')
      }

      resetTeacherForm()
      await Promise.all([loadTeachers(), loadTeacherSubjects()])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setTeacherSubmitting(false)
    }
  }

  const handleTeacherSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setTeacherSubjectSubmitting(true)
      setError('')
      const normalizedTeacherSubjectForm = normalizeTeacherSubjectForm(teacherSubjectForm)
      const validationError = validateTeacherSubjectForm(normalizedTeacherSubjectForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingTeacherSubject ? 'PUT' : 'POST'
      const url = isEditingTeacherSubject
        ? `${teacherSubjectApiPath}/${editingTeacherSubjectId}`
        : teacherSubjectApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedTeacherSubjectForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save mapping')
      }

      resetTeacherSubjectForm()
      await loadTeacherSubjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setTeacherSubjectSubmitting(false)
    }
  }

  const handleClassSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setClassSubmitting(true)
      setError('')
      const normalizedClassForm = normalizeClassForm(classForm)
      const validationError = validateClassForm(normalizedClassForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingClass ? 'PUT' : 'POST'
      const url = isEditingClass ? `${classApiPath}/${editingClassId}` : classApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedClassForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save class')
      }

      resetClassForm()
      await loadClasses()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setClassSubmitting(false)
    }
  }

  const handleClassSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setClassSubjectSubmitting(true)
      setError('')
      const normalizedClassSubjectForm = normalizeClassSubjectForm(classSubjectForm)
      const validationError = validateClassSubjectForm(normalizedClassSubjectForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingClassSubject ? 'PUT' : 'POST'
      const url = isEditingClassSubject
        ? `${classSubjectApiPath}/${editingClassSubjectId}`
        : classSubjectApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedClassSubjectForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save mapping')
      }

      resetClassSubjectForm()
      await loadClassSubjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setClassSubjectSubmitting(false)
    }
  }

  const handleClassStudentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setClassStudentSubmitting(true)
      setError('')
      const normalizedClassStudentForm = normalizeClassStudentForm(classStudentForm)
      const validationError = validateClassStudentForm(normalizedClassStudentForm)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = isEditingClassStudent ? 'PUT' : 'POST'
      const url = isEditingClassStudent
        ? `${classStudentApiPath}/${editingClassStudentId}`
        : classStudentApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedClassStudentForm),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save mapping')
      }

      resetClassStudentForm()
      await loadClassStudents()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setClassStudentSubmitting(false)
    }
  }

  const startStudentEdit = (student: Student) => {
    setStudentForm({
      name: student.name,
      rollNo: student.rollNo,
      fatherName: student.fatherName,
      studentPhone: student.studentPhone,
      fatherPhone: student.fatherPhone,
    })
    setEditingStudentId(student._id)
  }

  const startExamEdit = (exam: Exam) => {
    const examClasses = exam.examClasses?.length
      ? exam.examClasses
      : exam.classId && exam.sectionId
        ? [{ classId: exam.classId, sectionId: exam.sectionId }]
        : []

    setExamForm({
      examName: exam.examName,
      examClassKeys: examClasses.map((examClass) => getClassKey(examClass.classId, examClass.sectionId)),
      academicYear: exam.academicYear,
      description: exam.description || '',
      status: exam.status,
    })
    setEditingExamId(exam._id)
  }

  const startExamSubjectEdit = (examSubject: ExamSubject) => {
    setExamSubjectForm({
      subjectId: examSubject.subjectId,
      examDate: examSubject.examDate.slice(0, 10),
      totalMarks: String(examSubject.totalMarks),
      passingMarks: String(examSubject.passingMarks),
      instructions: examSubject.instructions || '',
    })
    setEditingExamSubjectId(examSubject._id)
  }

  const startSubjectEdit = (subject: Subject) => {
    setSubjectForm({
      name: subject.name,
    })
    setEditingSubjectId(subject._id)
  }

  const startTeacherEdit = (teacher: Teacher) => {
    setTeacherForm({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      password: '',
    })
    setEditingTeacherId(teacher._id)
  }

  const startTeacherSubjectEdit = (teacherSubject: TeacherSubject) => {
    setTeacherSubjectForm({
      className: teacherSubject.className,
      section: teacherSubject.section,
      subject: teacherSubject.subject,
      teacher: teacherSubject.teacher,
    })
    setEditingTeacherSubjectId(teacherSubject._id)
  }

  const startClassEdit = (classRecord: ClassRecord) => {
    setClassForm({
      className: classRecord.className,
      section: classRecord.section,
    })
    setEditingClassId(classRecord._id)
  }

  const startClassSubjectEdit = (classSubject: ClassSubject) => {
    setClassSubjectForm({
      className: classSubject.className,
      section: classSubject.section,
      subject: classSubject.subject,
    })
    setEditingClassSubjectId(classSubject._id)
  }

  const startClassStudentEdit = (classStudent: ClassStudent) => {
    setClassStudentForm({
      className: classStudent.className,
      section: classStudent.section,
      student: classStudent.student,
    })
    setEditingClassStudentId(classStudent._id)
  }

  const handleStudentDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this student record?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${studentApiPath}/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete student')
      }

      if (editingStudentId === id) {
        resetStudentForm()
      }
      await Promise.all([loadStudents(), loadClassStudents()])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleExamDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this exam?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${examApiPath}/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete exam')
      }

      if (editingExamId === id) {
        resetExamForm()
      }
      if (selectedExamId === id) {
        setSelectedExamId(null)
        resetExamSubjectForm()
      }
      await loadExams()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleExamSubjectDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this exam subject?')
    if (!shouldDelete) {
      return
    }
    if (!selectedExamId) {
      setError('Select an exam first to manage subjects')
      return
    }

    try {
      setError('')
      const response = await fetch(`${examSubjectApiPath}/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete exam subject')
      }

      if (editingExamSubjectId === id) {
        resetExamSubjectForm()
      }
      await loadExamSubjects(selectedExamId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleSubjectDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this subject?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${subjectApiPath}/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete subject')
      }

      if (editingSubjectId === id) {
        resetSubjectForm()
      }
      await Promise.all([loadSubjects(), loadClassSubjects(), loadTeacherSubjects()])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleTeacherDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this teacher?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${teacherApiPath}/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete teacher')
      }

      if (editingTeacherId === id) {
        resetTeacherForm()
      }
      await loadTeachers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleTeacherSubjectDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this mapping?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${teacherSubjectApiPath}/${id}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete mapping')
      }

      if (editingTeacherSubjectId === id) {
        resetTeacherSubjectForm()
      }
      await loadTeacherSubjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleClassDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this class?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${classApiPath}/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete class')
      }

      if (editingClassId === id) {
        resetClassForm()
      }
      await Promise.all([
        loadClasses(),
        loadClassSubjects(),
        loadClassStudents(),
        loadTeacherSubjects(),
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleClassSubjectDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this mapping?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${classSubjectApiPath}/${id}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete mapping')
      }

      if (editingClassSubjectId === id) {
        resetClassSubjectForm()
      }
      await loadClassSubjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleClassStudentDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this mapping?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${classStudentApiPath}/${id}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete mapping')
      }

      if (editingClassStudentId === id) {
        resetClassStudentForm()
      }
      await loadClassStudents()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleLoginSuccess = (payload: { token: string; user: AuthUser }) => {
    setAuthToken(payload.token)
    setAuthUser(payload.user)
    localStorage.setItem(authTokenStorageKey, payload.token)
    localStorage.setItem(authUserStorageKey, JSON.stringify(payload.user))
    setError('')
    setActivePage(payload.user.role === 'teacher' ? 'marks' : 'students')
  }

  const handleLogout = () => {
    setAuthToken('')
    setAuthUser(null)
    localStorage.removeItem(authTokenStorageKey)
    localStorage.removeItem(authUserStorageKey)
    setError('')
  }

  if (!authReady) {
    return (
      <main className="page">
        <section className="panel" style={{ maxWidth: 520, margin: '4rem auto 0' }}>
          <p>Checking session...</p>
        </section>
      </main>
    )
  }

  if (!authToken || !authUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Exam Marks Module</p>
          <h1>
            {isTeacherUser
              ? 'Teacher Marks Portal'
              : activePage === 'students'
              ? 'Student Management'
              : activePage === 'exams'
                ? 'Exam Management'
                : activePage === 'subjects'
                  ? 'Subject Management'
                  : activePage === 'teachers'
                    ? 'Teacher Management'
                    : activePage === 'teacherSubjects'
                      ? 'Teacher Subject Mapping'
              : activePage === 'marks'
                    ? 'Marks Management'
                  : activePage === 'classSubjects'
                    ? 'Class Subject Mapping'
                    : activePage === 'classStudents'
                      ? 'Class Student Mapping'
                      : activePage === 'notifications'
                        ? 'Parent Notifications'
                  : 'Class Management'}
          </h1>
          <p className="subtitle">
            {isTeacherUser
              ? 'Manage marks for your assigned class-subject mappings.'
              : activePage === 'students'
              ? 'Add, update, remove, and view student records only.'
              : activePage === 'exams'
                ? 'Add, edit, delete, and view all exams.'
                : activePage === 'subjects'
                  ? 'Create and manage subjects only.'
                  : activePage === 'teachers'
                    ? 'Create and manage teacher records only.'
                    : activePage === 'teacherSubjects'
                      ? 'Assign teachers to class and subject combinations.'
              : activePage === 'marks'
                    ? 'Manage student marks for existing exams and subjects.'
                  : activePage === 'classSubjects'
                    ? 'Connect subjects to class-section combinations.'
                    : activePage === 'classStudents'
                      ? 'Connect students to class-section combinations.'
                      : activePage === 'notifications'
                        ? 'Send WhatsApp notifications to parents.'
                  : 'Create and manage class-section combinations.'}
          </p>
        </div>
        <div className="tab-actions">
          {isTeacherUser ? (
            <button
              type="button"
              className={activePage === 'marks' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActivePage('marks')}
            >
              Marks
            </button>
          ) : (
            <>
              <button
                type="button"
                className={activePage === 'students' ? 'tab-button active' : 'tab-button'}
                onClick={() => setActivePage('students')}
              >
                Students
              </button>
              <button
                type="button"
                className={activePage === 'exams' ? 'tab-button active' : 'tab-button'}
                onClick={() => setActivePage('exams')}
              >
                Exams
              </button>
              <button
                type="button"
                className={activePage === 'subjects' ? 'tab-button active' : 'tab-button'}
                onClick={() => setActivePage('subjects')}
              >
                Subjects
              </button>
              <button
                type="button"
                className={activePage === 'teachers' ? 'tab-button active' : 'tab-button'}
                onClick={() => setActivePage('teachers')}
              >
                Teachers
              </button>
              <button
                type="button"
                className={
                  activePage === 'teacherSubjects' ? 'tab-button active' : 'tab-button'
                }
                onClick={() => setActivePage('teacherSubjects')}
              >
                Teacher Subjects
              </button>
              <button
                type="button"
                className={activePage === 'marks' ? 'tab-button active' : 'tab-button'}
                onClick={() => setActivePage('marks')}
              >
                Marks
              </button>
              <button
                type="button"
                className={
                  activePage === 'classSubjects' ? 'tab-button active' : 'tab-button'
                }
                onClick={() => setActivePage('classSubjects')}
              >
                Class Subjects
              </button>
              <button
                type="button"
                className={
                  activePage === 'classStudents' ? 'tab-button active' : 'tab-button'
                }
                onClick={() => setActivePage('classStudents')}
              >
                Class Students
              </button>
              <button
                type="button"
                className={activePage === 'classes' ? 'tab-button active' : 'tab-button'}
                onClick={() => setActivePage('classes')}
              >
                Classes
              </button>
              <button
                type="button"
                className={activePage === 'notifications' ? 'tab-button active' : 'tab-button'}
                onClick={() => setActivePage('notifications')}
              >
                Notifications
              </button>
            </>
          )}
          <button type="button" className="tab-button logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      {activePage === 'students' ? (
        <>
          <section className="panel panel-compact">
            <div className="stats-row">
              <div className="stat-card">
                <span>Total Students</span>
                <strong>{students.length}</strong>
              </div>
              <div className="search-wrap">
                <label htmlFor="search-students">Search students</label>
                <input
                  id="search-students"
                  placeholder="Search by name, roll no, phone..."
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>{isEditingStudent ? 'Edit Student' : 'Add Student'}</h2>
            <form className="student-form" onSubmit={handleStudentSubmit}>
              <label className="field">
                <span>Name</span>
                <input
                  placeholder="Student name"
                  value={studentForm.name}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, name: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Roll No</span>
                <input
                  placeholder="e.g. 12A045"
                  value={studentForm.rollNo}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, rollNo: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field field-full">
                <span>Father Name</span>
                <input
                  placeholder="Father's full name"
                  value={studentForm.fatherName}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, fatherName: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Student Phone</span>
                <input
                  placeholder="Student contact number"
                  value={studentForm.studentPhone}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, studentPhone: event.target.value })
                  }
                  inputMode="numeric"
                  pattern="[0-9]{10,15}"
                  maxLength={15}
                  required
                />
              </label>
              <label className="field">
                <span>Father Phone</span>
                <input
                  placeholder="Father's contact number"
                  value={studentForm.fatherPhone}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, fatherPhone: event.target.value })
                  }
                  inputMode="numeric"
                  pattern="[0-9]{10,15}"
                  maxLength={15}
                  required
                />
              </label>

              <div className="actions">
                <button type="submit" className="primary" disabled={studentSubmitting}>
                  {studentSubmitting
                    ? 'Saving...'
                    : isEditingStudent
                      ? 'Update'
                      : 'Add'}
                </button>
                {isEditingStudent ? (
                  <button type="button" onClick={resetStudentForm} className="secondary">
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>All Students</h2>
            {studentLoading ? <p>Loading...</p> : null}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Roll No</th>
                    <th>Father Name</th>
                    <th>Student Phone</th>
                    <th>Father Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.rollNo}</td>
                      <td>{student.fatherName}</td>
                      <td>{student.studentPhone}</td>
                      <td>{student.fatherPhone}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => startStudentEdit(student)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => void handleStudentDelete(student._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredStudents.length && !studentLoading ? (
                    <tr>
                      <td colSpan={6}>
                        {students.length
                          ? 'No students match your search.'
                          : 'No students found.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : activePage === 'exams' ? (
        <>
          <section className="panel panel-compact">
            <div className="stats-row">
              <div className="stat-card">
                <span>Total Exams</span>
                <strong>{exams.length}</strong>
              </div>
              <div className="search-wrap">
                <label htmlFor="search-exams">Search exams</label>
                <input
                  id="search-exams"
                  placeholder="Search by exam name, class, year, status..."
                  value={examSearch}
                  onChange={(event) => setExamSearch(event.target.value)}
                />
              </div>
              <label className="filter-field">
                <span>Filter Class</span>
                <select
                  value={examFilterClassKey}
                  onChange={(event) => setExamFilterClassKey(event.target.value)}
                >
                  <option value="">All Classes</option>
                  {classes.map((classRecord) => {
                    const optionValue = getClassKey(classRecord.className, classRecord.section)
                    return (
                      <option key={classRecord._id} value={optionValue}>
                        {classRecord.className} - {classRecord.section}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="filter-field">
                <span>Filter Year</span>
                <select
                  value={examFilterYear}
                  onChange={(event) => setExamFilterYear(event.target.value)}
                >
                  <option value="">All Years</option>
                  {examAcademicYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Filter Status</span>
                <select
                  value={examFilterStatus}
                  onChange={(event) => setExamFilterStatus(event.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>{isEditingExam ? 'Edit Exam' : 'Add Exam'}</h2>
            <form className="student-form" onSubmit={handleExamSubmit}>
              <label className="field field-full">
                <span>Exam Name</span>
                <input
                  placeholder="e.g. Mid Term"
                  value={examForm.examName}
                  onChange={(event) =>
                    setExamForm({ ...examForm, examName: event.target.value })
                  }
                  required
                />
              </label>
              <div className="field field-full">
                <span>Class-Section(s)</span>
                <div className="class-picker-actions">
                  <button type="button" className="secondary" onClick={selectAllExamClasses}>
                    Select All
                  </button>
                  <button type="button" className="secondary" onClick={clearExamClasses}>
                    Clear
                  </button>
                  <span>{examForm.examClassKeys.length} selected</span>
                </div>
                <div className="class-checklist">
                  {classes.length ? (
                    classes.map((classRecord) => {
                      const classKey = getClassKey(classRecord.className, classRecord.section)
                      const isChecked = examForm.examClassKeys.includes(classKey)
                      return (
                        <label key={classRecord._id} className="class-checklist-item">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(event) =>
                              handleExamClassSelection(classKey, event.target.checked)
                            }
                          />
                          <span>
                            {classRecord.className} - {classRecord.section}
                          </span>
                        </label>
                      )
                    })
                  ) : (
                    <p className="class-checklist-empty">No classes available</p>
                  )}
                </div>
              </div>
              <label className="field">
                <span>Academic Year</span>
                <input
                  placeholder="e.g. 2025-26"
                  value={examForm.academicYear}
                  onChange={(event) =>
                    setExamForm({ ...examForm, academicYear: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={examForm.status}
                  onChange={(event) =>
                    setExamForm({
                      ...examForm,
                      status: event.target.value as ExamFormState['status'],
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="field field-full">
                <span>Description (Optional)</span>
                <input
                  placeholder="Optional exam description"
                  value={examForm.description}
                  onChange={(event) =>
                    setExamForm({ ...examForm, description: event.target.value })
                  }
                />
              </label>

              <div className="actions">
                <button type="submit" className="primary" disabled={examSubmitting}>
                  {examSubmitting ? 'Saving...' : isEditingExam ? 'Update' : 'Add'}
                </button>
                {isEditingExam ? (
                  <button type="button" onClick={resetExamForm} className="secondary">
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>All Exams</h2>
            {examLoading ? <p>Loading...</p> : null}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Class(es)</th>
                    <th>Academic Year</th>
                    <th>Subjects Count</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam) => (
                    <tr key={exam._id}>
                      <td>{exam.examName}</td>
                      <td>
                        {(exam.examClasses?.length
                          ? exam.examClasses
                              .map((examClass) => `${examClass.classId}-${examClass.sectionId}`)
                              .join(', ')
                          : `${exam.classId}-${exam.sectionId}`) || '-'}
                      </td>
                      <td>{exam.academicYear}</td>
                      <td>{examSubjectCountByExam[exam._id] || 0}</td>
                      <td>{exam.status}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExamId(exam._id)
                              resetExamSubjectForm()
                            }}
                          >
                            Manage Subjects
                          </button>
                          <button type="button" onClick={() => startExamEdit(exam)}>
                            Edit
                          </button>
                          {exam.status === 'draft' ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setError('')
                                  const response = await fetch(`${examApiPath}/${exam._id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ...exam, status: 'published' }),
                                  })
                                  const payload = await response.json()
                                  if (!response.ok) {
                                    throw new Error(payload.message || 'Failed to publish exam')
                                  }
                                  await loadExams()
                                } catch (err) {
                                  const message =
                                    err instanceof Error ? err.message : 'Unexpected error'
                                  setError(message)
                                }
                              }}
                            >
                              Publish
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="danger"
                            onClick={() => void handleExamDelete(exam._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredExams.length && !examLoading ? (
                    <tr>
                      <td colSpan={6}>
                        {exams.length ? 'No exams match your search.' : 'No exams found.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Manage Subjects Inside Exam</h2>
            {!selectedExam ? (
              <p>Select an exam to configure its subjects.</p>
            ) : (
              <>
                <div className="exam-info-card">
                  <p>
                    <strong>Exam Name:</strong> {selectedExam.examName}
                  </p>
                  <p>
                    <strong>Class(es):</strong>{' '}
                    {(selectedExam.examClasses?.length
                      ? selectedExam.examClasses
                          .map((examClass) => `${examClass.classId}-${examClass.sectionId}`)
                          .join(', ')
                      : `${selectedExam.classId}-${selectedExam.sectionId}`) || '-'}
                  </p>
                  <p>
                    <strong>Academic Year:</strong> {selectedExam.academicYear}
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedExam.status}
                  </p>
                </div>

                <form className="student-form" onSubmit={handleExamSubjectSubmit}>
                  <label className="field">
                    <span>Subject</span>
                    <select
                      value={examSubjectForm.subjectId}
                      onChange={(event) =>
                        setExamSubjectForm({
                          ...examSubjectForm,
                          subjectId: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">
                        {examSubjectOptions.length
                          ? 'Select subject'
                          : 'No mapped subjects for selected class(es)'}
                      </option>
                      {examSubjectOptions.map((subjectName) => (
                        <option key={subjectName} value={subjectName}>
                          {subjectName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Exam Date</span>
                    <input
                      type="date"
                      value={examSubjectForm.examDate}
                      onChange={(event) =>
                        setExamSubjectForm({
                          ...examSubjectForm,
                          examDate: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Maximum Marks</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="e.g. 100"
                      value={examSubjectForm.totalMarks}
                      onChange={(event) =>
                        setExamSubjectForm({
                          ...examSubjectForm,
                          totalMarks: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Passing Marks</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 35"
                      value={examSubjectForm.passingMarks}
                      onChange={(event) =>
                        setExamSubjectForm({
                          ...examSubjectForm,
                          passingMarks: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field field-full">
                    <span>Instructions (Optional)</span>
                    <input
                      placeholder="Any special instructions"
                      value={examSubjectForm.instructions}
                      onChange={(event) =>
                        setExamSubjectForm({
                          ...examSubjectForm,
                          instructions: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="actions">
                    <button
                      type="submit"
                      className="primary"
                      disabled={examSubjectSubmitting}
                    >
                      {examSubjectSubmitting
                        ? 'Saving...'
                        : isEditingExamSubject
                          ? 'Update Subject'
                          : 'Add Subject'}
                    </button>
                    {isEditingExamSubject ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={resetExamSubjectForm}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Max Marks</th>
                        <th>Pass Marks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examSubjects.map((examSubject) => (
                        <tr key={examSubject._id}>
                          <td>{examSubject.subjectId}</td>
                          <td>{new Date(examSubject.examDate).toLocaleDateString()}</td>
                          <td>{examSubject.totalMarks}</td>
                          <td>{examSubject.passingMarks}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                onClick={() => startExamSubjectEdit(examSubject)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => void handleExamSubjectDelete(examSubject._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!examSubjects.length && !examSubjectsLoading ? (
                        <tr>
                          <td colSpan={5}>No subjects configured for this exam yet.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      ) : activePage === 'subjects' ? (
        <SubjectManagementPage
          subjects={subjects}
          subjectSearch={subjectSearch}
          setSubjectSearch={setSubjectSearch}
          isEditingSubject={isEditingSubject}
          handleSubjectSubmit={handleSubjectSubmit}
          subjectForm={subjectForm}
          setSubjectForm={setSubjectForm}
          subjectSubmitting={subjectSubmitting}
          resetSubjectForm={resetSubjectForm}
          subjectLoading={subjectLoading}
          filteredSubjects={filteredSubjects}
          startSubjectEdit={startSubjectEdit}
          handleSubjectDelete={handleSubjectDelete}
        />
      ) : activePage === 'teachers' ? (
        <TeacherManagementPage
          teachers={teachers}
          teacherSearch={teacherSearch}
          setTeacherSearch={setTeacherSearch}
          isEditingTeacher={isEditingTeacher}
          handleTeacherSubmit={handleTeacherSubmit}
          teacherForm={teacherForm}
          setTeacherForm={setTeacherForm}
          teacherSubmitting={teacherSubmitting}
          resetTeacherForm={resetTeacherForm}
          teacherLoading={teacherLoading}
          filteredTeachers={filteredTeachers}
          startTeacherEdit={startTeacherEdit}
          handleTeacherDelete={handleTeacherDelete}
        />
      ) : activePage === 'teacherSubjects' ? (
        <TeacherSubjectManagementPage
          teacherSubjects={teacherSubjects}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          teacherSubjectSearch={teacherSubjectSearch}
          setTeacherSubjectSearch={setTeacherSubjectSearch}
          isEditingTeacherSubject={isEditingTeacherSubject}
          handleTeacherSubjectSubmit={handleTeacherSubjectSubmit}
          teacherSubjectForm={teacherSubjectForm}
          setTeacherSubjectForm={setTeacherSubjectForm}
          teacherSubjectSubmitting={teacherSubjectSubmitting}
          resetTeacherSubjectForm={resetTeacherSubjectForm}
          teacherSubjectLoading={teacherSubjectLoading}
          filteredTeacherSubjects={filteredTeacherSubjects}
          startTeacherSubjectEdit={startTeacherSubjectEdit}
          handleTeacherSubjectDelete={handleTeacherSubjectDelete}
        />
      ) : activePage === 'marks' ? (
        <MarksManagementPage
          exams={exams}
          classStudents={classStudents}
          authToken={authToken}
        />
      ) : activePage === 'classSubjects' ? (
        <ClassSubjectManagementPage
          classSubjects={classSubjects}
          classes={classes}
          subjects={subjects}
          classSubjectSearch={classSubjectSearch}
          setClassSubjectSearch={setClassSubjectSearch}
          isEditingClassSubject={isEditingClassSubject}
          handleClassSubjectSubmit={handleClassSubjectSubmit}
          classSubjectForm={classSubjectForm}
          setClassSubjectForm={setClassSubjectForm}
          classSubjectSubmitting={classSubjectSubmitting}
          resetClassSubjectForm={resetClassSubjectForm}
          classSubjectLoading={classSubjectLoading}
          filteredClassSubjects={filteredClassSubjects}
          startClassSubjectEdit={startClassSubjectEdit}
          handleClassSubjectDelete={handleClassSubjectDelete}
        />
      ) : activePage === 'classStudents' ? (
        <ClassStudentManagementPage
          classStudents={classStudents}
          classes={classes}
          students={students}
          classStudentSearch={classStudentSearch}
          setClassStudentSearch={setClassStudentSearch}
          isEditingClassStudent={isEditingClassStudent}
          handleClassStudentSubmit={handleClassStudentSubmit}
          classStudentForm={classStudentForm}
          setClassStudentForm={setClassStudentForm}
          classStudentSubmitting={classStudentSubmitting}
          resetClassStudentForm={resetClassStudentForm}
          classStudentLoading={classStudentLoading}
          filteredClassStudents={filteredClassStudents}
          startClassStudentEdit={startClassStudentEdit}
          handleClassStudentDelete={handleClassStudentDelete}
        />
      ) : activePage === 'notifications' ? (
        <NotificationsPage
          exams={exams}
          students={students}
        />
      ) : (
        <>
          <section className="panel panel-compact">
            <div className="stats-row">
              <div className="stat-card">
                <span>Total Classes</span>
                <strong>{classes.length}</strong>
              </div>
              <div className="search-wrap">
                <label htmlFor="search-classes">Search classes</label>
                <input
                  id="search-classes"
                  placeholder="Search by class or section..."
                  value={classSearch}
                  onChange={(event) => setClassSearch(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>{isEditingClass ? 'Edit Class' : 'Add Class'}</h2>
            <form className="student-form" onSubmit={handleClassSubmit}>
              <label className="field">
                <span>Class</span>
                <input
                  placeholder="e.g. 10"
                  value={classForm.className}
                  onChange={(event) =>
                    setClassForm({ ...classForm, className: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Section</span>
                <input
                  placeholder="e.g. A"
                  value={classForm.section}
                  onChange={(event) =>
                    setClassForm({ ...classForm, section: event.target.value })
                  }
                  required
                />
              </label>

              <div className="actions">
                <button type="submit" className="primary" disabled={classSubmitting}>
                  {classSubmitting ? 'Saving...' : isEditingClass ? 'Update' : 'Add'}
                </button>
                {isEditingClass ? (
                  <button type="button" onClick={resetClassForm} className="secondary">
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>All Classes</h2>
            {classLoading ? <p>Loading...</p> : null}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((classRecord) => (
                    <tr key={classRecord._id}>
                      <td>{classRecord.className}</td>
                      <td>{classRecord.section}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => startClassEdit(classRecord)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => void handleClassDelete(classRecord._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredClasses.length && !classLoading ? (
                    <tr>
                      <td colSpan={3}>
                        {classes.length
                          ? 'No classes match your search.'
                          : 'No classes found.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export default App

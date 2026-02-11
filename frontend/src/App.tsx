import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import ClassStudentManagementPage from './pages/ClassStudentManagementPage'
import ClassSubjectManagementPage from './pages/ClassSubjectManagementPage'
import SubjectManagementPage from './pages/SubjectManagementPage'

type Student = {
  _id: string
  name: string
  rollNo: string
  fatherName: string
  studentPhone: string
  fatherPhone: string
}

type StudentFormState = Omit<Student, '_id'>

type Exam = {
  _id: string
  name: string
  examDate: string
  totalMarks: number
  targets: {
    className: string
    section: string
    subjects: string[]
  }[]
}

type ExamFormState = {
  name: string
  examDate: string
  totalMarks: string
  targets: {
    className: string
    section: string
    subjects: string[]
  }[]
}

type Subject = {
  _id: string
  name: string
}

type SubjectFormState = Omit<Subject, '_id'>

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
  name: '',
  examDate: '',
  totalMarks: '',
  targets: [],
}

const initialSubjectFormState: SubjectFormState = {
  name: '',
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
const subjectApiPath = '/api/subjects'
const classApiPath = '/api/classes'
const classSubjectApiPath = '/api/class-subjects'
const classStudentApiPath = '/api/class-students'
const phoneRegex = /^\d{10,15}$/

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

const normalizeExamForm = (form: ExamFormState): ExamFormState => {
  const normalizedTargets = form.targets
    .map((target) => ({
      className: target.className.trim(),
      section: target.section.trim(),
      subjects: target.subjects.map((subject) => subject.trim()).filter(Boolean),
    }))
    .filter((target) => target.className && target.section)

  const dedupedTargets = []
  const seenKeys = new Set<string>()
  for (const target of normalizedTargets) {
    const key = `${target.className.toLowerCase()}__${target.section.toLowerCase()}`
    if (seenKeys.has(key)) {
      continue
    }
    seenKeys.add(key)
    dedupedTargets.push({
      className: target.className,
      section: target.section,
      subjects: Array.from(new Set(target.subjects)).sort((a, b) =>
        a.localeCompare(b),
      ),
    })
  }

  return {
    name: form.name.trim(),
    examDate: form.examDate,
    totalMarks: form.totalMarks.trim(),
    targets: dedupedTargets,
  }
}

const validateExamForm = (form: ExamFormState): string | null => {
  if (!form.name) return 'Exam Name is required'
  if (!form.examDate) return 'Exam Date is required'
  if (!form.targets.length) return 'Add at least one class and subject mapping'
  for (const target of form.targets) {
    if (!target.className || !target.section) return 'Class and section are required'
    if (!target.subjects.length) return 'At least one subject is required per class'
  }

  const examDate = new Date(form.examDate)
  if (Number.isNaN(examDate.getTime())) return 'Exam Date is invalid'

  const totalMarks = Number(form.totalMarks)
  if (!Number.isFinite(totalMarks)) return 'Total Marks must be a number'
  if (!Number.isInteger(totalMarks) || totalMarks < 1) {
    return 'Total Marks must be a whole number greater than 0'
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
  const [activePage, setActivePage] = useState<
    | 'students'
    | 'exams'
    | 'subjects'
    | 'classSubjects'
    | 'classStudents'
    | 'classes'
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
  const [examTargetClassKey, setExamTargetClassKey] = useState('')
  const [examTargetSubjects, setExamTargetSubjects] = useState<string[]>([])
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [examSearch, setExamSearch] = useState('')
  const [examLoading, setExamLoading] = useState(false)
  const [examSubmitting, setExamSubmitting] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>(
    initialSubjectFormState,
  )
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [subjectLoading, setSubjectLoading] = useState(false)
  const [subjectSubmitting, setSubjectSubmitting] = useState(false)

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

  const isEditingStudent = useMemo(
    () => Boolean(editingStudentId),
    [editingStudentId],
  )
  const isEditingExam = useMemo(() => Boolean(editingExamId), [editingExamId])
  const isEditingSubject = useMemo(
    () => Boolean(editingSubjectId),
    [editingSubjectId],
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
    if (!normalizedSearch) {
      return exams
    }

    return exams.filter((exam) => {
      const formattedDate = new Date(exam.examDate).toLocaleDateString()
      const targetSearchBlob = exam.targets
        .map((target) => `${target.className} ${target.section} ${target.subjects.join(' ')}`)
        .join(' ')
        .toLowerCase()
      return (
        exam.name.toLowerCase().includes(normalizedSearch) ||
        targetSearchBlob.includes(normalizedSearch) ||
        formattedDate.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [examSearch, exams])

  const filteredSubjects = useMemo(() => {
    const normalizedSearch = subjectSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return subjects
    }

    return subjects.filter((subject) => {
      return subject.name.toLowerCase().includes(normalizedSearch)
    })
  }, [subjectSearch, subjects])

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

  const examTargetSubjectOptions = useMemo(() => {
    const [className = '', section = ''] = examTargetClassKey.split('__')
    if (!className || !section) {
      return []
    }

    const names = classSubjects
      .filter(
        (classSubject) =>
          classSubject.className === className && classSubject.section === section,
      )
      .map((classSubject) => classSubject.subject.trim())
      .filter(Boolean)

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [classSubjects, examTargetClassKey])

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

      setExams(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setExamLoading(false)
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
    void Promise.all([
      loadStudents(),
      loadExams(),
      loadSubjects(),
      loadClassSubjects(),
      loadClassStudents(),
      loadClasses(),
    ])
  }, [])

  const resetStudentForm = () => {
    setStudentForm(initialStudentFormState)
    setEditingStudentId(null)
  }

  const resetExamForm = () => {
    setExamForm(initialExamFormState)
    setExamTargetClassKey('')
    setExamTargetSubjects([])
    setEditingExamId(null)
  }

  const resetSubjectForm = () => {
    setSubjectForm(initialSubjectFormState)
    setEditingSubjectId(null)
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

  const addOrUpdateExamTarget = () => {
    const [className = '', section = ''] = examTargetClassKey.split('__')
    if (!className || !section) {
      setError('Select class and section for the exam mapping')
      return
    }
    if (!examTargetSubjects.length) {
      setError('Select at least one subject for the selected class')
      return
    }

    setError('')
    setExamForm((previousForm) => {
      const nextTarget = {
        className,
        section,
        subjects: Array.from(new Set(examTargetSubjects)).sort((a, b) =>
          a.localeCompare(b),
        ),
      }

      const key = `${className.toLowerCase()}__${section.toLowerCase()}`
      const remainingTargets = previousForm.targets.filter((target) => {
        const targetKey = `${target.className.toLowerCase()}__${target.section.toLowerCase()}`
        return targetKey !== key
      })

      return {
        ...previousForm,
        targets: [...remainingTargets, nextTarget],
      }
    })
    setExamTargetSubjects([])
  }

  const removeExamTarget = (className: string, section: string) => {
    setExamForm((previousForm) => ({
      ...previousForm,
      targets: previousForm.targets.filter(
        (target) =>
          !(
            target.className.toLowerCase() === className.toLowerCase() &&
            target.section.toLowerCase() === section.toLowerCase()
          ),
      ),
    }))
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
        body: JSON.stringify({
          ...normalizedExamForm,
          totalMarks: Number(normalizedExamForm.totalMarks),
        }),
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
    setExamForm({
      name: exam.name,
      examDate: exam.examDate.slice(0, 10),
      totalMarks: String(exam.totalMarks),
      targets: exam.targets || [],
    })
    setExamTargetClassKey('')
    setExamTargetSubjects([])
    setEditingExamId(exam._id)
  }

  const startSubjectEdit = (subject: Subject) => {
    setSubjectForm({
      name: subject.name,
    })
    setEditingSubjectId(subject._id)
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
      await loadExams()
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
      await Promise.all([loadSubjects(), loadClassSubjects()])
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
      await Promise.all([loadClasses(), loadClassSubjects(), loadClassStudents()])
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

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Exam Marks Module</p>
          <h1>
            {activePage === 'students'
              ? 'Student Management'
              : activePage === 'exams'
                ? 'Exam Management'
                : activePage === 'subjects'
                  ? 'Subject Management'
                  : activePage === 'classSubjects'
                    ? 'Class Subject Mapping'
                    : activePage === 'classStudents'
                      ? 'Class Student Mapping'
                  : 'Class Management'}
          </h1>
          <p className="subtitle">
            {activePage === 'students'
              ? 'Add, update, remove, and view student records only.'
              : activePage === 'exams'
                ? 'Add, edit, delete, and view all exams.'
                : activePage === 'subjects'
                  ? 'Create and manage subjects only.'
                  : activePage === 'classSubjects'
                    ? 'Connect subjects to class-section combinations.'
                    : activePage === 'classStudents'
                      ? 'Connect students to class-section combinations.'
                  : 'Create and manage class-section combinations.'}
          </p>
        </div>
        <div className="tab-actions">
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
                  placeholder="Search by exam, class, section, subject..."
                  value={examSearch}
                  onChange={(event) => setExamSearch(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>{isEditingExam ? 'Edit Exam' : 'Add Exam'}</h2>
            <form className="student-form" onSubmit={handleExamSubmit}>
              <label className="field field-full">
                <span>Exam Name</span>
                <input
                  placeholder="e.g. Mid Term"
                  value={examForm.name}
                  onChange={(event) =>
                    setExamForm({ ...examForm, name: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Class & Section</span>
                <select
                  value={examTargetClassKey}
                  onChange={(event) => {
                    setExamTargetClassKey(event.target.value)
                    setExamTargetSubjects([])
                  }}
                >
                  <option value="">
                    {classes.length ? 'Select class and section' : 'No classes available'}
                  </option>
                  {classes.map((classRecord) => {
                    const optionValue = `${classRecord.className}__${classRecord.section}`
                    return (
                      <option key={classRecord._id} value={optionValue}>
                        {classRecord.className} - {classRecord.section}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="field field-full">
                <span>Subjects For Selected Class</span>
                <select
                  multiple
                  value={examTargetSubjects}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions).map(
                      (option) => option.value,
                    )
                    setExamTargetSubjects(selected)
                  }}
                  size={Math.min(Math.max(examTargetSubjectOptions.length, 3), 8)}
                >
                  {examTargetSubjectOptions.map((subjectName) => (
                    <option key={subjectName} value={subjectName}>
                      {subjectName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="actions">
                <button type="button" className="secondary" onClick={addOrUpdateExamTarget}>
                  Add/Update Class Subjects
                </button>
              </div>
              <div className="table-wrap field-full">
                <table>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Section</th>
                      <th>Subjects</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examForm.targets.map((target) => (
                      <tr key={`${target.className}__${target.section}`}>
                        <td>{target.className}</td>
                        <td>{target.section}</td>
                        <td>{target.subjects.join(', ')}</td>
                        <td>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => removeExamTarget(target.className, target.section)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!examForm.targets.length ? (
                      <tr>
                        <td colSpan={4}>No class-subject mappings added yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <label className="field">
                <span>Exam Date</span>
                <input
                  type="date"
                  value={examForm.examDate}
                  onChange={(event) =>
                    setExamForm({ ...examForm, examDate: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Total Marks</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 100"
                  value={examForm.totalMarks}
                  onChange={(event) =>
                    setExamForm({ ...examForm, totalMarks: event.target.value })
                  }
                  required
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
                    <th>Class/Section/Subjects</th>
                    <th>Exam Date</th>
                    <th>Total Marks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam) => (
                    <tr key={exam._id}>
                      <td>{exam.name}</td>
                      <td>
                        {exam.targets
                          .map(
                            (target) =>
                              `${target.className}-${target.section}: ${target.subjects.join(', ')}`,
                          )
                          .join(' | ')}
                      </td>
                      <td>{new Date(exam.examDate).toLocaleDateString()}</td>
                      <td>{exam.totalMarks}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => startExamEdit(exam)}>
                            Edit
                          </button>
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
                      <td colSpan={5}>
                        {exams.length ? 'No exams match your search.' : 'No exams found.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
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

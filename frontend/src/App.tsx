import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Student = {
  _id: string
  name: string
  rollNo: string
  className: string
  section: string
  fatherName: string
  studentPhone: string
  fatherPhone: string
}

type StudentFormState = Omit<Student, '_id'>

type Exam = {
  _id: string
  name: string
  className: string
  section: string
  subject: string
  examDate: string
  totalMarks: number
}

type ExamFormState = {
  name: string
  className: string
  section: string
  subject: string
  examDate: string
  totalMarks: string
}

const initialStudentFormState: StudentFormState = {
  name: '',
  rollNo: '',
  className: '',
  section: '',
  fatherName: '',
  studentPhone: '',
  fatherPhone: '',
}

const initialExamFormState: ExamFormState = {
  name: '',
  className: '',
  section: '',
  subject: '',
  examDate: '',
  totalMarks: '',
}

const studentApiPath = '/api/students'
const examApiPath = '/api/exams'
const phoneRegex = /^\d{10,15}$/

const normalizeStudentForm = (form: StudentFormState): StudentFormState => {
  return {
    name: form.name.trim(),
    rollNo: form.rollNo.trim(),
    className: form.className.trim(),
    section: form.section.trim(),
    fatherName: form.fatherName.trim(),
    studentPhone: form.studentPhone.trim(),
    fatherPhone: form.fatherPhone.trim(),
  }
}

const validateStudentForm = (form: StudentFormState): string | null => {
  if (!form.name) return 'Name is required'
  if (!form.rollNo) return 'Roll No is required'
  if (!form.className) return 'Class is required'
  if (!form.section) return 'Section is required'
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
  return {
    name: form.name.trim(),
    className: form.className.trim(),
    section: form.section.trim(),
    subject: form.subject.trim(),
    examDate: form.examDate,
    totalMarks: form.totalMarks.trim(),
  }
}

const validateExamForm = (form: ExamFormState): string | null => {
  if (!form.name) return 'Exam Name is required'
  if (!form.subject) return 'Subject is required'
  if (!form.className) return 'Class is required'
  if (!form.section) return 'Section is required'
  if (!form.examDate) return 'Exam Date is required'

  const examDate = new Date(form.examDate)
  if (Number.isNaN(examDate.getTime())) return 'Exam Date is invalid'

  const totalMarks = Number(form.totalMarks)
  if (!Number.isFinite(totalMarks)) return 'Total Marks must be a number'
  if (!Number.isInteger(totalMarks) || totalMarks < 1) {
    return 'Total Marks must be a whole number greater than 0'
  }
  return null
}

function App() {
  const [activePage, setActivePage] = useState<'students' | 'exams'>('students')

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
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [examSearch, setExamSearch] = useState('')
  const [examLoading, setExamLoading] = useState(false)
  const [examSubmitting, setExamSubmitting] = useState(false)

  const [error, setError] = useState('')

  const isEditingStudent = useMemo(
    () => Boolean(editingStudentId),
    [editingStudentId],
  )
  const isEditingExam = useMemo(() => Boolean(editingExamId), [editingExamId])

  const filteredStudents = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return students
    }

    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(normalizedSearch) ||
        student.rollNo.toLowerCase().includes(normalizedSearch) ||
        student.className.toLowerCase().includes(normalizedSearch) ||
        student.section.toLowerCase().includes(normalizedSearch) ||
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
      return (
        exam.name.toLowerCase().includes(normalizedSearch) ||
        exam.subject.toLowerCase().includes(normalizedSearch) ||
        exam.className.toLowerCase().includes(normalizedSearch) ||
        exam.section.toLowerCase().includes(normalizedSearch) ||
        formattedDate.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [examSearch, exams])

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

  useEffect(() => {
    void Promise.all([loadStudents(), loadExams()])
  }, [])

  const resetStudentForm = () => {
    setStudentForm(initialStudentFormState)
    setEditingStudentId(null)
  }

  const resetExamForm = () => {
    setExamForm(initialExamFormState)
    setEditingExamId(null)
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

  const startStudentEdit = (student: Student) => {
    setStudentForm({
      name: student.name,
      rollNo: student.rollNo,
      className: student.className,
      section: student.section,
      fatherName: student.fatherName,
      studentPhone: student.studentPhone,
      fatherPhone: student.fatherPhone,
    })
    setEditingStudentId(student._id)
  }

  const startExamEdit = (exam: Exam) => {
    setExamForm({
      name: exam.name,
      className: exam.className,
      section: exam.section,
      subject: exam.subject,
      examDate: exam.examDate.slice(0, 10),
      totalMarks: String(exam.totalMarks),
    })
    setEditingExamId(exam._id)
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
      await loadStudents()
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

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Exam Marks Module</p>
          <h1>{activePage === 'students' ? 'Student Management' : 'Exam Management'}</h1>
          <p className="subtitle">
            {activePage === 'students'
              ? 'Add, update, remove, and view student records.'
              : 'Add, edit, delete, and view all exams.'}
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
                  placeholder="Search by name, roll no, class, section..."
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
              <label className="field">
                <span>Class</span>
                <input
                  placeholder="e.g. 10"
                  value={studentForm.className}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, className: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Section</span>
                <input
                  placeholder="e.g. A"
                  value={studentForm.section}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, section: event.target.value })
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
                    <th>Class</th>
                    <th>Sec</th>
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
                      <td>{student.className}</td>
                      <td>{student.section}</td>
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
                      <td colSpan={8}>
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
      ) : (
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
                <span>Subject</span>
                <input
                  placeholder="e.g. Mathematics"
                  value={examForm.subject}
                  onChange={(event) =>
                    setExamForm({ ...examForm, subject: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Class</span>
                <input
                  placeholder="e.g. 10"
                  value={examForm.className}
                  onChange={(event) =>
                    setExamForm({ ...examForm, className: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Section</span>
                <input
                  placeholder="e.g. A"
                  value={examForm.section}
                  onChange={(event) =>
                    setExamForm({ ...examForm, section: event.target.value })
                  }
                  required
                />
              </label>
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
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Exam Date</th>
                    <th>Total Marks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam) => (
                    <tr key={exam._id}>
                      <td>{exam.name}</td>
                      <td>{exam.subject}</td>
                      <td>{exam.className}</td>
                      <td>{exam.section}</td>
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
                      <td colSpan={7}>
                        {exams.length ? 'No exams match your search.' : 'No exams found.'}
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

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

const initialFormState: StudentFormState = {
  name: '',
  rollNo: '',
  className: '',
  section: '',
  fatherName: '',
  studentPhone: '',
  fatherPhone: '',
}

const apiPath = '/api/students'

function App() {
  const [students, setStudents] = useState<Student[]>([])
  const [form, setForm] = useState<StudentFormState>(initialFormState)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isEditing = useMemo(() => Boolean(editingId), [editingId])
  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
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
  }, [search, students])

  const loadStudents = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(apiPath)
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
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStudents()
  }, [])

  const resetForm = () => {
    setForm(initialFormState)
    setEditingId(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')

      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `${apiPath}/${editingId}` : apiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save student')
      }

      resetForm()
      await loadStudents()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (student: Student) => {
    setForm({
      name: student.name,
      rollNo: student.rollNo,
      className: student.className,
      section: student.section,
      fatherName: student.fatherName,
      studentPhone: student.studentPhone,
      fatherPhone: student.fatherPhone,
    })
    setEditingId(student._id)
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this student record?')
    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${apiPath}/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete student')
      }

      if (editingId === id) {
        resetForm()
      }
      await loadStudents()
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
          <h1>Student Management</h1>
          <p className="subtitle">Add, update, remove, and view student records.</p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{isEditing ? 'Edit Student' : 'Add Student'}</h2>
        <form className="student-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              placeholder="Student name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Roll No</span>
            <input
              placeholder="e.g. 12A045"
              value={form.rollNo}
              onChange={(event) =>
                setForm({ ...form, rollNo: event.target.value })
              }
              required
            />
          </label>
          <label className="field">
            <span>Class</span>
            <input
              placeholder="e.g. 10"
              value={form.className}
              onChange={(event) =>
                setForm({ ...form, className: event.target.value })
              }
              required
            />
          </label>
          <label className="field">
            <span>Section</span>
            <input
              placeholder="e.g. A"
              value={form.section}
              onChange={(event) =>
                setForm({ ...form, section: event.target.value })
              }
              required
            />
          </label>
          <label className="field field-full">
            <span>Father Name</span>
            <input
              placeholder="Father's full name"
              value={form.fatherName}
              onChange={(event) =>
                setForm({ ...form, fatherName: event.target.value })
              }
              required
            />
          </label>
          <label className="field">
            <span>Student Phone</span>
            <input
              placeholder="Student contact number"
              value={form.studentPhone}
              onChange={(event) =>
                setForm({ ...form, studentPhone: event.target.value })
              }
              required
            />
          </label>
          <label className="field">
            <span>Father Phone</span>
            <input
              placeholder="Father's contact number"
              value={form.fatherPhone}
              onChange={(event) =>
                setForm({ ...form, fatherPhone: event.target.value })
              }
              required
            />
          </label>

          <div className="actions">
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            </button>
            {isEditing ? (
              <button type="button" onClick={resetForm} className="secondary">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>All Students</h2>
        {loading ? <p>Loading...</p> : null}
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
                      <button type="button" onClick={() => startEdit(student)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleDelete(student._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredStudents.length && !loading ? (
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
    </main>
  )
}

export default App

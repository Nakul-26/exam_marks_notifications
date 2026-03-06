import { useRef, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'

type Teacher = {
  _id: string
  name: string
  email: string
  phone: string
}

type TeacherFormState = Omit<Teacher, '_id'> & {
  password: string
}

type TeacherManagementPageProps = {
  teachers: Teacher[]
  teacherSearch: string
  setTeacherSearch: Dispatch<SetStateAction<string>>
  isEditingTeacher: boolean
  handleTeacherSubmit: (event: FormEvent<HTMLFormElement>) => void
  teacherForm: TeacherFormState
  setTeacherForm: Dispatch<SetStateAction<TeacherFormState>>
  teacherSubmitting: boolean
  resetTeacherForm: () => void
  teacherLoading: boolean
  filteredTeachers: Teacher[]
  startTeacherEdit: (teacher: Teacher) => void
  handleTeacherDelete: (id: string) => Promise<void>
  handleTeacherPasswordReset: (id: string, password: string) => Promise<void>
  teacherBulkSubmitting: boolean
  downloadTeacherExcelTemplate: () => void
  uploadTeacherExcelSheet: (file: File) => Promise<void>
}

function TeacherManagementPage({
  teachers,
  teacherSearch,
  setTeacherSearch,
  isEditingTeacher,
  handleTeacherSubmit,
  teacherForm,
  setTeacherForm,
  teacherSubmitting,
  resetTeacherForm,
  teacherLoading,
  filteredTeachers,
  startTeacherEdit,
  handleTeacherDelete,
  handleTeacherPasswordReset,
  teacherBulkSubmitting,
  downloadTeacherExcelTemplate,
  uploadTeacherExcelSheet,
}: TeacherManagementPageProps) {
  const teacherUploadInputRef = useRef<HTMLInputElement | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [resetTeacherId, setResetTeacherId] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetError, setResetError] = useState('')

  const selectedResetTeacher =
    teachers.find((teacher) => teacher._id === resetTeacherId) || null

  const startResetPassword = (teacher: Teacher) => {
    setResetTeacherId(teacher._id)
    setResetPassword('')
    setResetConfirmPassword('')
    setResetError('')
  }

  const cancelResetPassword = () => {
    setResetTeacherId('')
    setResetPassword('')
    setResetConfirmPassword('')
    setResetError('')
  }

  const submitPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetTeacherId) {
      return
    }
    if (resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters')
      return
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match')
      return
    }

    try {
      setResetSubmitting(true)
      setResetError('')
      await handleTeacherPasswordReset(resetTeacherId, resetPassword)
      cancelResetPassword()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password'
      setResetError(message)
    } finally {
      setResetSubmitting(false)
    }
  }

  return (
    <>
      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total Teachers</span>
            <strong>{teachers.length}</strong>
          </div>
          <div className="search-wrap">
            <label htmlFor="search-teachers">Search teachers</label>
            <input
              id="search-teachers"
              placeholder="Search by name, email, phone..."
              value={teacherSearch}
              onChange={(event) => setTeacherSearch(event.target.value)}
            />
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="secondary"
              onClick={downloadTeacherExcelTemplate}
            >
              Download Empty Excel
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => teacherUploadInputRef.current?.click()}
              disabled={teacherBulkSubmitting}
            >
              {teacherBulkSubmitting ? 'Uploading...' : 'Upload Filled Excel'}
            </button>
            <input
              ref={teacherUploadInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void uploadTeacherExcelSheet(file)
                }
                event.target.value = ''
              }}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{isEditingTeacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
        <form className="student-form" onSubmit={handleTeacherSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              placeholder="Teacher name"
              value={teacherForm.name}
              onChange={(event) =>
                setTeacherForm({ ...teacherForm, name: event.target.value })
              }
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="teacher@example.com"
              value={teacherForm.email}
              onChange={(event) =>
                setTeacherForm({ ...teacherForm, email: event.target.value })
              }
              required
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              placeholder="Teacher phone number"
              value={teacherForm.phone}
              onChange={(event) =>
                setTeacherForm({ ...teacherForm, phone: event.target.value })
              }
              inputMode="numeric"
              pattern="[0-9]{10,15}"
              maxLength={15}
              required
            />
          </label>
          <label className="field">
            <span>{isEditingTeacher ? 'Password (Optional)' : 'Password'}</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={
                  isEditingTeacher
                    ? 'Leave empty to keep current password'
                    : 'Set teacher password'
                }
                value={teacherForm.password}
                onChange={(event) =>
                  setTeacherForm({ ...teacherForm, password: event.target.value })
                }
                required={!isEditingTeacher}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="actions">
            <button type="submit" className="primary" disabled={teacherSubmitting}>
              {teacherSubmitting ? 'Saving...' : isEditingTeacher ? 'Update' : 'Add'}
            </button>
            {isEditingTeacher ? (
              <button type="button" onClick={resetTeacherForm} className="secondary">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {selectedResetTeacher ? (
        <section className="panel">
          <h2>Reset Teacher Password</h2>
          <p>
            Reset password for <strong>{selectedResetTeacher.name}</strong> (
            {selectedResetTeacher.email})
          </p>
          {resetError ? <p className="error">{resetError}</p> : null}
          <form className="student-form" onSubmit={submitPasswordReset}>
            <label className="field">
              <span>New Password</span>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <label className="field">
              <span>Confirm Password</span>
              <input
                type="password"
                placeholder="Re-enter password"
                value={resetConfirmPassword}
                onChange={(event) => setResetConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <div className="actions">
              <button type="submit" className="primary" disabled={resetSubmitting}>
                {resetSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={cancelResetPassword}
                disabled={resetSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h2>All Teachers</h2>
        {teacherLoading ? <p>Loading...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher._id}>
                  <td>{teacher.name}</td>
                  <td>{teacher.email}</td>
                  <td>{teacher.phone}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => startTeacherEdit(teacher)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => startResetPassword(teacher)}>
                        Reset Password
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleTeacherDelete(teacher._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredTeachers.length && !teacherLoading ? (
                <tr>
                  <td colSpan={4}>
                    {teachers.length
                      ? 'No teachers match your search.'
                      : 'No teachers found.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default TeacherManagementPage

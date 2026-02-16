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
}: TeacherManagementPageProps) {
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
            <input
              type="password"
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

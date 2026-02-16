import type { Dispatch, FormEvent, SetStateAction } from 'react'

type Subject = {
  _id: string
  name: string
}

type ClassRecord = {
  _id: string
  className: string
  section: string
}

type Teacher = {
  _id: string
  name: string
  email: string
  phone: string
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

type TeacherSubjectManagementPageProps = {
  teacherSubjects: TeacherSubject[]
  classes: ClassRecord[]
  subjects: Subject[]
  teachers: Teacher[]
  teacherSubjectSearch: string
  setTeacherSubjectSearch: Dispatch<SetStateAction<string>>
  isEditingTeacherSubject: boolean
  handleTeacherSubjectSubmit: (event: FormEvent<HTMLFormElement>) => void
  teacherSubjectForm: TeacherSubjectFormState
  setTeacherSubjectForm: Dispatch<SetStateAction<TeacherSubjectFormState>>
  teacherSubjectSubmitting: boolean
  resetTeacherSubjectForm: () => void
  teacherSubjectLoading: boolean
  filteredTeacherSubjects: TeacherSubject[]
  startTeacherSubjectEdit: (teacherSubject: TeacherSubject) => void
  handleTeacherSubjectDelete: (id: string) => Promise<void>
}

function TeacherSubjectManagementPage({
  teacherSubjects,
  classes,
  subjects,
  teachers,
  teacherSubjectSearch,
  setTeacherSubjectSearch,
  isEditingTeacherSubject,
  handleTeacherSubjectSubmit,
  teacherSubjectForm,
  setTeacherSubjectForm,
  teacherSubjectSubmitting,
  resetTeacherSubjectForm,
  teacherSubjectLoading,
  filteredTeacherSubjects,
  startTeacherSubjectEdit,
  handleTeacherSubjectDelete,
}: TeacherSubjectManagementPageProps) {
  const selectedClassKey = `${teacherSubjectForm.className}__${teacherSubjectForm.section}`

  return (
    <>
      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total Mappings</span>
            <strong>{teacherSubjects.length}</strong>
          </div>
          <div className="search-wrap">
            <label htmlFor="search-teacher-subjects">Search mappings</label>
            <input
              id="search-teacher-subjects"
              placeholder="Search by class, section, subject, teacher..."
              value={teacherSubjectSearch}
              onChange={(event) => setTeacherSubjectSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{isEditingTeacherSubject ? 'Edit Mapping' : 'Add Mapping'}</h2>
        <form className="student-form" onSubmit={handleTeacherSubjectSubmit}>
          <label className="field">
            <span>Class & Section</span>
            <select
              value={selectedClassKey}
              onChange={(event) => {
                const [className, section] = event.target.value.split('__')
                setTeacherSubjectForm({
                  ...teacherSubjectForm,
                  className: className || '',
                  section: section || '',
                })
              }}
              required
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

          <label className="field">
            <span>Subject</span>
            <select
              value={teacherSubjectForm.subject}
              onChange={(event) =>
                setTeacherSubjectForm({
                  ...teacherSubjectForm,
                  subject: event.target.value,
                })
              }
              required
            >
              <option value="">
                {subjects.length ? 'Select subject' : 'No subjects available'}
              </option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject.name}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Teacher</span>
            <select
              value={teacherSubjectForm.teacher}
              onChange={(event) =>
                setTeacherSubjectForm({
                  ...teacherSubjectForm,
                  teacher: event.target.value,
                })
              }
              required
            >
              <option value="">
                {teachers.length ? 'Select teacher' : 'No teachers available'}
              </option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.email})
                </option>
              ))}
            </select>
          </label>

          <div className="actions">
            <button type="submit" className="primary" disabled={teacherSubjectSubmitting}>
              {teacherSubjectSubmitting
                ? 'Saving...'
                : isEditingTeacherSubject
                  ? 'Update'
                  : 'Add'}
            </button>
            {isEditingTeacherSubject ? (
              <button
                type="button"
                onClick={resetTeacherSubjectForm}
                className="secondary"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>All Mappings</h2>
        {teacherSubjectLoading ? <p>Loading...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Section</th>
                <th>Subject</th>
                <th>Teacher</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeacherSubjects.map((teacherSubject) => (
                <tr key={teacherSubject._id}>
                  <td>{teacherSubject.className}</td>
                  <td>{teacherSubject.section}</td>
                  <td>{teacherSubject.subject}</td>
                  <td>{teacherSubject.teacherName}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => startTeacherSubjectEdit(teacherSubject)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleTeacherSubjectDelete(teacherSubject._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredTeacherSubjects.length && !teacherSubjectLoading ? (
                <tr>
                  <td colSpan={5}>
                    {teacherSubjects.length
                      ? 'No mappings match your search.'
                      : 'No mappings found.'}
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

export default TeacherSubjectManagementPage

import type { Dispatch, FormEvent, SetStateAction } from 'react'

type Student = {
  _id: string
  name: string
  rollNo: string
}

type ClassRecord = {
  _id: string
  className: string
  section: string
}

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

type ClassStudentManagementPageProps = {
  classStudents: ClassStudent[]
  classes: ClassRecord[]
  students: Student[]
  classStudentSearch: string
  setClassStudentSearch: Dispatch<SetStateAction<string>>
  isEditingClassStudent: boolean
  handleClassStudentSubmit: (event: FormEvent<HTMLFormElement>) => void
  classStudentForm: ClassStudentFormState
  setClassStudentForm: Dispatch<SetStateAction<ClassStudentFormState>>
  classStudentSubmitting: boolean
  resetClassStudentForm: () => void
  classStudentLoading: boolean
  filteredClassStudents: ClassStudent[]
  startClassStudentEdit: (classStudent: ClassStudent) => void
  handleClassStudentDelete: (id: string) => Promise<void>
}

function ClassStudentManagementPage({
  classStudents,
  classes,
  students,
  classStudentSearch,
  setClassStudentSearch,
  isEditingClassStudent,
  handleClassStudentSubmit,
  classStudentForm,
  setClassStudentForm,
  classStudentSubmitting,
  resetClassStudentForm,
  classStudentLoading,
  filteredClassStudents,
  startClassStudentEdit,
  handleClassStudentDelete,
}: ClassStudentManagementPageProps) {
  const selectedClassKey = `${classStudentForm.className}__${classStudentForm.section}`

  return (
    <>
      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total Mappings</span>
            <strong>{classStudents.length}</strong>
          </div>
          <div className="search-wrap">
            <label htmlFor="search-class-students">Search mappings</label>
            <input
              id="search-class-students"
              placeholder="Search by class, section, student..."
              value={classStudentSearch}
              onChange={(event) => setClassStudentSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{isEditingClassStudent ? 'Edit Mapping' : 'Add Mapping'}</h2>
        <form className="student-form" onSubmit={handleClassStudentSubmit}>
          <label className="field">
            <span>Class & Section</span>
            <select
              value={selectedClassKey}
              onChange={(event) => {
                const [className, section] = event.target.value.split('__')
                setClassStudentForm({
                  ...classStudentForm,
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
            <span>Student</span>
            <select
              value={classStudentForm.student}
              onChange={(event) =>
                setClassStudentForm({ ...classStudentForm, student: event.target.value })
              }
              required
            >
              <option value="">
                {students.length ? 'Select student' : 'No students available'}
              </option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} ({student.rollNo})
                </option>
              ))}
            </select>
          </label>

          <div className="actions">
            <button type="submit" className="primary" disabled={classStudentSubmitting}>
              {classStudentSubmitting
                ? 'Saving...'
                : isEditingClassStudent
                  ? 'Update'
                  : 'Add'}
            </button>
            {isEditingClassStudent ? (
              <button type="button" onClick={resetClassStudentForm} className="secondary">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>All Mappings</h2>
        {classStudentLoading ? <p>Loading...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Section</th>
                <th>Student</th>
                <th>Roll No</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClassStudents.map((classStudent) => (
                <tr key={classStudent._id}>
                  <td>{classStudent.className}</td>
                  <td>{classStudent.section}</td>
                  <td>{classStudent.studentName}</td>
                  <td>{classStudent.studentRollNo}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => startClassStudentEdit(classStudent)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleClassStudentDelete(classStudent._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredClassStudents.length && !classStudentLoading ? (
                <tr>
                  <td colSpan={5}>
                    {classStudents.length
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

export default ClassStudentManagementPage

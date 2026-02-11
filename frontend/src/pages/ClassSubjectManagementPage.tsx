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

type ClassSubject = {
  _id: string
  className: string
  section: string
  subject: string
}

type ClassSubjectFormState = Omit<ClassSubject, '_id'>

type ClassSubjectManagementPageProps = {
  classSubjects: ClassSubject[]
  classes: ClassRecord[]
  subjects: Subject[]
  classSubjectSearch: string
  setClassSubjectSearch: Dispatch<SetStateAction<string>>
  isEditingClassSubject: boolean
  handleClassSubjectSubmit: (event: FormEvent<HTMLFormElement>) => void
  classSubjectForm: ClassSubjectFormState
  setClassSubjectForm: Dispatch<SetStateAction<ClassSubjectFormState>>
  classSubjectSubmitting: boolean
  resetClassSubjectForm: () => void
  classSubjectLoading: boolean
  filteredClassSubjects: ClassSubject[]
  startClassSubjectEdit: (classSubject: ClassSubject) => void
  handleClassSubjectDelete: (id: string) => Promise<void>
}

function ClassSubjectManagementPage({
  classSubjects,
  classes,
  subjects,
  classSubjectSearch,
  setClassSubjectSearch,
  isEditingClassSubject,
  handleClassSubjectSubmit,
  classSubjectForm,
  setClassSubjectForm,
  classSubjectSubmitting,
  resetClassSubjectForm,
  classSubjectLoading,
  filteredClassSubjects,
  startClassSubjectEdit,
  handleClassSubjectDelete,
}: ClassSubjectManagementPageProps) {
  const selectedClassKey = `${classSubjectForm.className}__${classSubjectForm.section}`

  return (
    <>
      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total Mappings</span>
            <strong>{classSubjects.length}</strong>
          </div>
          <div className="search-wrap">
            <label htmlFor="search-class-subjects">Search mappings</label>
            <input
              id="search-class-subjects"
              placeholder="Search by class, section, subject..."
              value={classSubjectSearch}
              onChange={(event) => setClassSubjectSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{isEditingClassSubject ? 'Edit Mapping' : 'Add Mapping'}</h2>
        <form className="student-form" onSubmit={handleClassSubjectSubmit}>
          <label className="field">
            <span>Class & Section</span>
            <select
              value={selectedClassKey}
              onChange={(event) => {
                const [className, section] = event.target.value.split('__')
                setClassSubjectForm({
                  ...classSubjectForm,
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
              value={classSubjectForm.subject}
              onChange={(event) =>
                setClassSubjectForm({ ...classSubjectForm, subject: event.target.value })
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

          <div className="actions">
            <button type="submit" className="primary" disabled={classSubjectSubmitting}>
              {classSubjectSubmitting
                ? 'Saving...'
                : isEditingClassSubject
                  ? 'Update'
                  : 'Add'}
            </button>
            {isEditingClassSubject ? (
              <button type="button" onClick={resetClassSubjectForm} className="secondary">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>All Mappings</h2>
        {classSubjectLoading ? <p>Loading...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Section</th>
                <th>Subject</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClassSubjects.map((classSubject) => (
                <tr key={classSubject._id}>
                  <td>{classSubject.className}</td>
                  <td>{classSubject.section}</td>
                  <td>{classSubject.subject}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => startClassSubjectEdit(classSubject)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleClassSubjectDelete(classSubject._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredClassSubjects.length && !classSubjectLoading ? (
                <tr>
                  <td colSpan={4}>
                    {classSubjects.length
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

export default ClassSubjectManagementPage

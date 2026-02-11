import type { Dispatch, FormEvent, SetStateAction } from 'react'

type Subject = {
  _id: string
  name: string
}

type SubjectFormState = Omit<Subject, '_id'>

type SubjectManagementPageProps = {
  subjects: Subject[]
  subjectSearch: string
  setSubjectSearch: Dispatch<SetStateAction<string>>
  isEditingSubject: boolean
  handleSubjectSubmit: (event: FormEvent<HTMLFormElement>) => void
  subjectForm: SubjectFormState
  setSubjectForm: Dispatch<SetStateAction<SubjectFormState>>
  subjectSubmitting: boolean
  resetSubjectForm: () => void
  subjectLoading: boolean
  filteredSubjects: Subject[]
  startSubjectEdit: (subject: Subject) => void
  handleSubjectDelete: (id: string) => Promise<void>
}

function SubjectManagementPage({
  subjects,
  subjectSearch,
  setSubjectSearch,
  isEditingSubject,
  handleSubjectSubmit,
  subjectForm,
  setSubjectForm,
  subjectSubmitting,
  resetSubjectForm,
  subjectLoading,
  filteredSubjects,
  startSubjectEdit,
  handleSubjectDelete,
}: SubjectManagementPageProps) {
  return (
    <>
      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total Subjects</span>
            <strong>{subjects.length}</strong>
          </div>
          <div className="search-wrap">
            <label htmlFor="search-subjects">Search subjects</label>
            <input
              id="search-subjects"
              placeholder="Search by subject..."
              value={subjectSearch}
              onChange={(event) => setSubjectSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{isEditingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
        <form className="student-form" onSubmit={handleSubjectSubmit}>
          <label className="field field-full">
            <span>Subject Name</span>
            <input
              placeholder="e.g. Mathematics"
              value={subjectForm.name}
              onChange={(event) =>
                setSubjectForm({ ...subjectForm, name: event.target.value })
              }
              required
            />
          </label>

          <div className="actions">
            <button type="submit" className="primary" disabled={subjectSubmitting}>
              {subjectSubmitting ? 'Saving...' : isEditingSubject ? 'Update' : 'Add'}
            </button>
            {isEditingSubject ? (
              <button type="button" onClick={resetSubjectForm} className="secondary">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>All Subjects</h2>
        {subjectLoading ? <p>Loading...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr key={subject._id}>
                  <td>{subject.name}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => startSubjectEdit(subject)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleSubjectDelete(subject._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredSubjects.length && !subjectLoading ? (
                <tr>
                  <td colSpan={2}>
                    {subjects.length
                      ? 'No subjects match your search.'
                      : 'No subjects found.'}
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

export default SubjectManagementPage

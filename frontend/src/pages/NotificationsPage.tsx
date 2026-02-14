import { useEffect, useMemo, useState } from 'react'

type Exam = {
  _id: string
  examName: string
  academicYear: string
}

type Student = {
  _id: string
  name: string
  rollNo: string
  fatherName: string
  fatherPhone: string
}

type ExamSubject = {
  _id: string
  subjectId: string
}

type ExamMark = {
  studentId: string
  studentName: string
  studentRollNo: string
  examSubjectId: string
  subjectId: string
  marksObtained: number
  totalMarks: number | null
  passingMarks: number | null
}

type StudentMarksSummary = {
  studentId: string
  studentName: string
  studentRollNo: string
  fatherName: string
  fatherPhone: string
  marks: Array<{
    subjectId: string
    marksObtained: number
    totalMarks: number
    passingMarks: number
  }>
}

type SendResultRow = {
  studentId: string
  studentName: string
  studentRollNo: string
  parentPhone: string
  ok: boolean
  error: string
}

type NotificationsPageProps = {
  exams: Exam[]
  students: Student[]
}

const examSubjectsApiPath = '/api/exam-subjects'
const examMarksApiPath = '/api/exam-marks'
const marksNotificationsApiPath = '/api/notifications/whatsapp/marks'

function NotificationsPage({ exams, students }: NotificationsPageProps) {
  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedExamSubjectId, setSelectedExamSubjectId] = useState('')
  const [search, setSearch] = useState('')
  const [additionalMessage, setAdditionalMessage] = useState('')
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([])
  const [examMarks, setExamMarks] = useState<ExamMark[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [sendResults, setSendResults] = useState<SendResultRow[]>([])

  const studentById = useMemo(() => {
    return new Map(students.map((student) => [student._id, student]))
  }, [students])

  const selectedExam = useMemo(() => {
    return exams.find((exam) => exam._id === selectedExamId) || null
  }, [exams, selectedExamId])

  const loadExamData = async (examId: string) => {
    try {
      setLoading(true)
      setError('')
      const [subjectsResponse, marksResponse] = await Promise.all([
        fetch(`${examSubjectsApiPath}/exam/${examId}`),
        fetch(`${examMarksApiPath}/exam/${examId}`),
      ])
      const subjectsPayload = await subjectsResponse.json()
      const marksPayload = await marksResponse.json()

      if (!subjectsResponse.ok) {
        throw new Error(subjectsPayload.message || 'Failed to load exam subjects')
      }
      if (!marksResponse.ok) {
        throw new Error(marksPayload.message || 'Failed to load exam marks')
      }

      setExamSubjects(subjectsPayload.data || [])
      setExamMarks(marksPayload.data || [])
      setSelectedExamSubjectId('')
      setSendResults([])
      setSuccessMessage('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
      setExamSubjects([])
      setExamMarks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedExamId) {
      setExamSubjects([])
      setExamMarks([])
      setSelectedStudentIds([])
      setSelectedExamSubjectId('')
      return
    }
    void loadExamData(selectedExamId)
  }, [selectedExamId])

  const filteredMarks = useMemo(() => {
    if (!selectedExamSubjectId) {
      return examMarks
    }
    return examMarks.filter((mark) => mark.examSubjectId === selectedExamSubjectId)
  }, [examMarks, selectedExamSubjectId])

  const recipientRows = useMemo(() => {
    const grouped = new Map<string, StudentMarksSummary>()

    for (const mark of filteredMarks) {
      const student = studentById.get(mark.studentId)
      const existing = grouped.get(mark.studentId) || {
        studentId: mark.studentId,
        studentName: mark.studentName,
        studentRollNo: mark.studentRollNo,
        fatherName: student?.fatherName || '',
        fatherPhone: student?.fatherPhone || '',
        marks: [],
      }

      existing.marks.push({
        subjectId: mark.subjectId,
        marksObtained: mark.marksObtained,
        totalMarks: Number(mark.totalMarks || 0),
        passingMarks: Number(mark.passingMarks || 0),
      })

      grouped.set(mark.studentId, existing)
    }

    return Array.from(grouped.values()).sort((a, b) => a.studentName.localeCompare(b.studentName))
  }, [filteredMarks, studentById])

  const filteredRecipientRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) {
      return recipientRows
    }

    return recipientRows.filter((row) => {
      const searchBlob =
        `${row.studentName} ${row.studentRollNo} ${row.fatherName} ${row.fatherPhone}`.toLowerCase()
      return searchBlob.includes(normalizedSearch)
    })
  }, [recipientRows, search])

  const sendableRows = useMemo(() => {
    return filteredRecipientRows.filter((row) => row.fatherPhone.trim())
  }, [filteredRecipientRows])

  useEffect(() => {
    setSelectedStudentIds(sendableRows.map((row) => row.studentId))
  }, [sendableRows])

  const toggleStudentSelection = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((previousIds) => {
      if (checked) {
        const nextIds = new Set([...previousIds, studentId])
        return Array.from(nextIds)
      }
      return previousIds.filter((id) => id !== studentId)
    })
  }

  const selectAllVisible = () => {
    setSelectedStudentIds(sendableRows.map((row) => row.studentId))
  }

  const clearSelection = () => {
    setSelectedStudentIds([])
  }

  const handleSendMarksNotifications = async () => {
    try {
      setSending(true)
      setError('')
      setSuccessMessage('')

      if (!selectedExamId) {
        throw new Error('Select an exam first')
      }
      if (!selectedStudentIds.length) {
        throw new Error('Select at least one student')
      }

      const response = await fetch(marksNotificationsApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          examSubjectId: selectedExamSubjectId,
          studentIds: selectedStudentIds,
          additionalMessage: additionalMessage.trim(),
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to send marks notifications')
      }

      const summary = payload?.data
      setSendResults(summary?.results || [])
      setSuccessMessage(`Sent ${summary?.sent || 0} message(s), failed ${summary?.failed || 0}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {error ? <p className="error">{error}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Selected Parents</span>
            <strong>{selectedStudentIds.length}</strong>
          </div>
          <label className="filter-field">
            <span>Exam</span>
            <select
              value={selectedExamId}
              onChange={(event) => {
                setSelectedExamId(event.target.value)
                setSendResults([])
                setSuccessMessage('')
              }}
            >
              <option value="">{exams.length ? 'Select exam' : 'No exams found'}</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.examName} ({exam.academicYear})
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Subject</span>
            <select
              value={selectedExamSubjectId}
              onChange={(event) => {
                setSelectedExamSubjectId(event.target.value)
                setSendResults([])
                setSuccessMessage('')
              }}
              disabled={!selectedExamId}
            >
              <option value="">All Subjects</option>
              {examSubjects.map((examSubject) => (
                <option key={examSubject._id} value={examSubject._id}>
                  {examSubject.subjectId}
                </option>
              ))}
            </select>
          </label>
          <div className="search-wrap">
            <label htmlFor="search-notify">Search students</label>
            <input
              id="search-notify"
              placeholder="Search by student, roll no, parent..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Message Note (Optional)</h2>
        <label className="field field-full">
          <span>Additional text to include with marks</span>
          <textarea
            className="message-box"
            placeholder="e.g. Please discuss performance and contact class teacher for guidance."
            value={additionalMessage}
            onChange={(event) => setAdditionalMessage(event.target.value)}
            rows={3}
          />
        </label>
      </section>

      <section className="panel">
        <h2>Marks Notification Recipients</h2>
        <div className="actions" style={{ marginTop: 0 }}>
          <button type="button" className="secondary" onClick={selectAllVisible}>
            Select All Visible
          </button>
          <button type="button" className="secondary" onClick={clearSelection}>
            Clear
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => void handleSendMarksNotifications()}
            disabled={sending || loading || !selectedExamId || !selectedStudentIds.length}
          >
            {sending ? 'Sending...' : 'Send Marks on WhatsApp'}
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Student</th>
                <th>Roll No</th>
                <th>Parent</th>
                <th>Parent Phone</th>
                <th>Marks Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipientRows.map((row) => {
                const hasPhone = Boolean(row.fatherPhone.trim())
                const checked = selectedStudentIds.includes(row.studentId)
                const marksSummary = row.marks
                  .map((mark) => `${mark.subjectId}: ${mark.marksObtained}/${mark.totalMarks}`)
                  .join(' | ')

                return (
                  <tr key={row.studentId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!hasPhone}
                        onChange={(event) =>
                          toggleStudentSelection(row.studentId, event.target.checked)
                        }
                      />
                    </td>
                    <td>{row.studentName}</td>
                    <td>{row.studentRollNo}</td>
                    <td>{row.fatherName}</td>
                    <td>{row.fatherPhone || 'No phone available'}</td>
                    <td>{marksSummary || '-'}</td>
                  </tr>
                )
              })}
              {!filteredRecipientRows.length && !loading ? (
                <tr>
                  <td colSpan={6}>
                    {selectedExam
                      ? 'No marks available for selected filters.'
                      : 'Select exam to load marks recipients.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Last Send Result</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Parent Phone</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {sendResults.map((row) => (
                <tr key={`${row.studentId}-${row.parentPhone}`}>
                  <td>{row.studentName}</td>
                  <td>{row.studentRollNo}</td>
                  <td>{row.parentPhone}</td>
                  <td>{row.ok ? 'Sent' : 'Failed'}</td>
                  <td>{row.error || '-'}</td>
                </tr>
              ))}
              {!sendResults.length ? (
                <tr>
                  <td colSpan={5}>No send activity yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export default NotificationsPage

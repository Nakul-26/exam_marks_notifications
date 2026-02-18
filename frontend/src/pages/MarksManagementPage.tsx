import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import * as XLSX from 'xlsx'

type Exam = {
  _id: string
  examClasses?: Array<{
    classId: string
    sectionId: string
  }>
  examName: string
  classId: string
  sectionId: string
  academicYear: string
  status: 'draft' | 'published' | 'completed'
}

type ClassStudent = {
  _id: string
  className: string
  section: string
  student: string
  studentName: string
  studentRollNo: string
}

type ExamSubject = {
  _id: string
  examId: string
  subjectId: string
  examDate: string
  totalMarks: number
  passingMarks: number
}

type ExamMark = {
  _id: string
  examId: string
  examSubjectId: string
  studentId: string
  studentName: string
  studentRollNo: string
  subjectId: string
  totalMarks: number | null
  passingMarks: number | null
  marksObtained: number
  remarks: string
}

type MarkFormState = {
  examSubjectId: string
  studentId: string
  marksObtained: string
  remarks: string
}

type BulkMarkRow = {
  studentId: string
  studentName: string
  studentRollNo: string
  markId: string | null
  marksObtained: string
  remarks: string
}

type MarksManagementPageProps = {
  exams: Exam[]
  classStudents: ClassStudent[]
  authToken: string
}

const examMarkApiPath = '/api/exam-marks'
const examSubjectApiPath = '/api/exam-subjects'
const excelTemplateHeaders = [
  'studentName',
  'studentRollNo',
  'marksObtained',
  'remarks',
]
const classKeySeparator = '__'

const getClassKey = (classId: string, sectionId: string): string =>
  `${classId}${classKeySeparator}${sectionId}`

const initialMarkFormState: MarkFormState = {
  examSubjectId: '',
  studentId: '',
  marksObtained: '',
  remarks: '',
}

function MarksManagementPage({ exams, classStudents, authToken }: MarksManagementPageProps) {
  const [selectedExamId, setSelectedExamId] = useState('')
  const [subjectFilterId, setSubjectFilterId] = useState('')
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([])
  const [examMarks, setExamMarks] = useState<ExamMark[]>([])
  const [markForm, setMarkForm] = useState<MarkFormState>(initialMarkFormState)
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null)
  const [markSearch, setMarkSearch] = useState('')
  const [bulkSubjectId, setBulkSubjectId] = useState('')
  const [bulkRows, setBulkRows] = useState<BulkMarkRow[]>([])
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subjectLoading, setSubjectLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${authToken}` }),
    [authToken],
  )

  const selectedExam =
    exams.find((exam) => exam._id === selectedExamId) || null

  const selectedFormExamSubject = useMemo(() => {
    return examSubjects.find((examSubject) => examSubject._id === markForm.examSubjectId) || null
  }, [examSubjects, markForm.examSubjectId])

  const selectedBulkExamSubject = useMemo(() => {
    return examSubjects.find((examSubject) => examSubject._id === bulkSubjectId) || null
  }, [examSubjects, bulkSubjectId])

  const eligibleStudents = useMemo(() => {
    if (!selectedExam) {
      return []
    }

    const examClassKeys = new Set(
      (selectedExam.examClasses || []).map((examClass) =>
        getClassKey(examClass.classId, examClass.sectionId),
      ),
    )
    if (!examClassKeys.size && selectedExam.classId && selectedExam.sectionId) {
      examClassKeys.add(getClassKey(selectedExam.classId, selectedExam.sectionId))
    }

    return classStudents
      .filter(
        (classStudent) =>
          examClassKeys.has(getClassKey(classStudent.className, classStudent.section)),
      )
      .sort((a, b) => a.studentName.localeCompare(b.studentName))
  }, [classStudents, selectedExam])

  const filteredMarks = useMemo(() => {
    const normalizedSearch = markSearch.trim().toLowerCase()
    return examMarks.filter((mark) => {
      const matchesSubject = !subjectFilterId || mark.examSubjectId === subjectFilterId
      const searchBlob =
        `${mark.studentName} ${mark.studentRollNo} ${mark.subjectId} ${mark.marksObtained}`.toLowerCase()
      const matchesSearch = !normalizedSearch || searchBlob.includes(normalizedSearch)
      return matchesSubject && matchesSearch
    })
  }, [examMarks, markSearch, subjectFilterId])

  const resetForm = () => {
    setMarkForm((previous) => ({
      ...initialMarkFormState,
      examSubjectId: previous.examSubjectId,
    }))
    setEditingMarkId(null)
  }

  const loadExamSubjects = async (examId: string) => {
    try {
      setSubjectLoading(true)
      setError('')
      const response = await fetch(`${examSubjectApiPath}/exam/${examId}`, {
        headers: authHeader,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load exam subjects')
      }

      const loadedExamSubjects = payload.data || []
      setExamSubjects(loadedExamSubjects)
      setSubjectFilterId('')
      setBulkSubjectId(loadedExamSubjects[0]?._id || '')
      setMarkForm((previous) => ({
        ...previous,
        examSubjectId: loadedExamSubjects[0]?._id || '',
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
      setExamSubjects([])
    } finally {
      setSubjectLoading(false)
    }
  }

  const loadExamMarks = async (examId: string) => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${examMarkApiPath}/exam/${examId}`, {
        headers: authHeader,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to load marks')
      }

      setExamMarks(payload.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
      setExamMarks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!exams.length) {
      setSelectedExamId('')
      setExamSubjects([])
      setExamMarks([])
      return
    }

    setSelectedExamId((previousExamId) => {
      if (previousExamId && exams.some((exam) => exam._id === previousExamId)) {
        return previousExamId
      }
      return exams[0]._id
    })
  }, [exams])

  useEffect(() => {
    if (!selectedExamId) {
      setExamSubjects([])
      setExamMarks([])
      setBulkRows([])
      return
    }

    setEditingMarkId(null)
    setMarkForm(initialMarkFormState)
    void Promise.all([loadExamSubjects(selectedExamId), loadExamMarks(selectedExamId)])
  }, [selectedExamId])

  useEffect(() => {
    if (!bulkSubjectId || !selectedExam) {
      setBulkRows([])
      return
    }

    const existingMarkByStudentId = new Map(
      examMarks
        .filter((mark) => mark.examSubjectId === bulkSubjectId)
        .map((mark) => [mark.studentId, mark]),
    )

    const nextRows = eligibleStudents.map((classStudent) => {
      const existingMark = existingMarkByStudentId.get(classStudent.student)
      return {
        studentId: classStudent.student,
        studentName: classStudent.studentName,
        studentRollNo: classStudent.studentRollNo,
        markId: existingMark?._id || null,
        marksObtained:
          existingMark && Number.isFinite(existingMark.marksObtained)
            ? String(existingMark.marksObtained)
            : '',
        remarks: existingMark?.remarks || '',
      }
    })

    setBulkRows(nextRows)
  }, [bulkSubjectId, eligibleStudents, examMarks, selectedExam])

  const handleMarkSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedExamId) {
      setError('Select an exam first')
      return
    }

    if (!markForm.examSubjectId) {
      setError('Subject is required')
      return
    }
    if (!markForm.studentId) {
      setError('Student is required')
      return
    }

    const marksObtained = Number(markForm.marksObtained)
    if (!Number.isFinite(marksObtained) || !Number.isInteger(marksObtained) || marksObtained < 0) {
      setError('Marks obtained must be a whole number 0 or greater')
      return
    }

    if (selectedFormExamSubject && marksObtained > selectedFormExamSubject.totalMarks) {
      setError(
        `Marks obtained cannot be greater than maximum marks (${selectedFormExamSubject.totalMarks})`,
      )
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const method = editingMarkId ? 'PUT' : 'POST'
      const url = editingMarkId
        ? `${examMarkApiPath}/${editingMarkId}`
        : examMarkApiPath

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          examId: selectedExamId,
          examSubjectId: markForm.examSubjectId,
          studentId: markForm.studentId,
          marksObtained,
          remarks: markForm.remarks.trim(),
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save marks')
      }

      resetForm()
      await loadExamMarks(selectedExamId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (mark: ExamMark) => {
    setMarkForm({
      examSubjectId: mark.examSubjectId,
      studentId: mark.studentId,
      marksObtained: String(mark.marksObtained),
      remarks: mark.remarks || '',
    })
    setEditingMarkId(mark._id)
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm('Delete this marks record?')
    if (!shouldDelete || !selectedExamId) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${examMarkApiPath}/${id}`, {
        method: 'DELETE',
        headers: authHeader,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete marks')
      }

      if (editingMarkId === id) {
        resetForm()
      }

      await loadExamMarks(selectedExamId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  const handleBulkRowChange = (
    studentId: string,
    key: 'marksObtained' | 'remarks',
    value: string,
  ) => {
    setBulkRows((previousRows) =>
      previousRows.map((row) => {
        if (row.studentId !== studentId) {
          return row
        }
        return { ...row, [key]: value }
      }),
    )
  }

  const handleBulkSave = async () => {
    if (!selectedExamId) {
      setError('Select an exam first')
      return
    }
    if (!bulkSubjectId) {
      setError('Select subject for bulk entry')
      return
    }
    if (!selectedBulkExamSubject) {
      setError('Selected bulk subject is invalid')
      return
    }

    const rowsToSave = bulkRows.filter((row) => row.marksObtained.trim() !== '')
    if (!rowsToSave.length) {
      setError('Enter marks for at least one student')
      return
    }

    for (const row of rowsToSave) {
      const parsedMarks = Number(row.marksObtained)
      if (!Number.isFinite(parsedMarks) || !Number.isInteger(parsedMarks) || parsedMarks < 0) {
        setError(
          `Invalid marks for ${row.studentName}. Use a whole number 0 or greater.`,
        )
        return
      }
      if (parsedMarks > selectedBulkExamSubject.totalMarks) {
        setError(
          `Marks for ${row.studentName} cannot be greater than maximum marks (${selectedBulkExamSubject.totalMarks}).`,
        )
        return
      }
    }

    try {
      setBulkSubmitting(true)
      setError('')

      await Promise.all(
        rowsToSave.map(async (row) => {
          const method = row.markId ? 'PUT' : 'POST'
          const url = row.markId ? `${examMarkApiPath}/${row.markId}` : examMarkApiPath

          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({
              examId: selectedExamId,
              examSubjectId: bulkSubjectId,
              studentId: row.studentId,
              marksObtained: Number(row.marksObtained),
              remarks: row.remarks.trim(),
            }),
          })
          const payload = await response.json()

          if (!response.ok) {
            throw new Error(payload.message || `Failed to save marks for ${row.studentName}`)
          }
        }),
      )

      await loadExamMarks(selectedExamId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      setBulkSubmitting(false)
    }
  }

  const downloadExcelTemplate = () => {
    if (!selectedExam || !selectedBulkExamSubject) {
      setError('Select exam and subject before downloading template')
      return
    }

    const rows = eligibleStudents.map((student) => ({
      studentName: student.studentName,
      studentRollNo: student.studentRollNo,
      marksObtained: '',
      remarks: '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: excelTemplateHeaders,
      skipHeader: false,
    })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MarksTemplate')
    const fileName = `marks_template_${selectedExam.examName}_${selectedBulkExamSubject.subjectId}.xlsx`
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '')
    XLSX.writeFile(workbook, fileName)
  }

  const uploadExcelSheet = async (file: File) => {
    if (!selectedExamId) {
      setError('Select an exam first')
      return
    }
    if (!bulkSubjectId) {
      setError('Select subject for upload')
      return
    }
    if (!selectedBulkExamSubject) {
      setError('Selected bulk subject is invalid')
      return
    }

    try {
      setBulkSubmitting(true)
      setError('')

      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        throw new Error('Uploaded file has no sheet')
      }

      const worksheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
      })

      if (!rows.length) {
        throw new Error('Uploaded sheet has no data rows')
      }

      const headers = Object.keys(rows[0] || {})
      const hasRequiredHeaders =
        headers.includes('studentRollNo') && headers.includes('marksObtained')
      if (!hasRequiredHeaders) {
        throw new Error(
          'Invalid headers. Required columns: studentRollNo, marksObtained, remarks',
        )
      }

      const eligibleByRollNo = new Map(
        eligibleStudents.map((student) => [
          student.studentRollNo.trim().toLowerCase(),
          student,
        ]),
      )

      const existingMarkByStudentId = new Map(
        examMarks
          .filter((mark) => mark.examSubjectId === bulkSubjectId)
          .map((mark) => [mark.studentId, mark]),
      )

      const seenRollNos = new Set<string>()
      const payloadRows: Array<{
        studentId: string
        markId: string | null
        marksObtained: number
        remarks: string
        studentName: string
      }> = []

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]
        const rollNo = String(row.studentRollNo || '').trim()
        const marksValue = String(row.marksObtained || '').trim()
        const remarks = String(row.remarks || '').trim()

        if (!rollNo && !marksValue && !remarks) {
          continue
        }
        if (!rollNo) {
          throw new Error(`Row ${index + 2}: studentRollNo is required`)
        }
        if (!marksValue) {
          throw new Error(`Row ${index + 2}: marksObtained is required`)
        }

        const normalizedRollNo = rollNo.toLowerCase()
        if (seenRollNos.has(normalizedRollNo)) {
          throw new Error(`Row ${index + 2}: duplicate studentRollNo "${rollNo}"`)
        }
        seenRollNos.add(normalizedRollNo)

        const classStudent = eligibleByRollNo.get(normalizedRollNo)
        if (!classStudent) {
          throw new Error(
            `Row ${index + 2}: student roll number "${rollNo}" is not mapped to this exam class`,
          )
        }

        const parsedMarks = Number(marksValue)
        if (!Number.isFinite(parsedMarks) || !Number.isInteger(parsedMarks) || parsedMarks < 0) {
          throw new Error(`Row ${index + 2}: marksObtained must be a whole number 0 or greater`)
        }
        if (parsedMarks > selectedBulkExamSubject.totalMarks) {
          throw new Error(
            `Row ${index + 2}: marksObtained cannot be greater than ${selectedBulkExamSubject.totalMarks}`,
          )
        }

        const existingMark = existingMarkByStudentId.get(classStudent.student)
        payloadRows.push({
          studentId: classStudent.student,
          markId: existingMark?._id || null,
          marksObtained: parsedMarks,
          remarks,
          studentName: classStudent.studentName,
        })
      }

      if (!payloadRows.length) {
        throw new Error('No valid rows found to upload')
      }

      await Promise.all(
        payloadRows.map(async (row) => {
          const method = row.markId ? 'PUT' : 'POST'
          const url = row.markId ? `${examMarkApiPath}/${row.markId}` : examMarkApiPath

          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({
              examId: selectedExamId,
              examSubjectId: bulkSubjectId,
              studentId: row.studentId,
              marksObtained: row.marksObtained,
              remarks: row.remarks,
            }),
          })
          const payload = await response.json()
          if (!response.ok) {
            throw new Error(payload.message || `Failed to save marks for ${row.studentName}`)
          }
        }),
      )

      await loadExamMarks(selectedExamId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ''
      }
      setBulkSubmitting(false)
    }
  }

  return (
    <>
      {error ? <p className="error">{error}</p> : null}

      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total Marks Entries</span>
            <strong>{examMarks.length}</strong>
          </div>
          <label className="filter-field">
            <span>Exam</span>
            <select
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
            >
              <option value="">{exams.length ? 'Select exam' : 'No exams available'}</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.examName} (
                  {exam.examClasses?.length
                    ? exam.examClasses
                        .map((examClass) => `${examClass.classId}-${examClass.sectionId}`)
                        .join(', ')
                    : `${exam.classId}-${exam.sectionId}`}
                  , {exam.academicYear})
                </option>
              ))}
            </select>
          </label>
          <div className="search-wrap">
            <label htmlFor="search-marks">Search marks</label>
            <input
              id="search-marks"
              placeholder="Search by student, roll no, subject..."
              value={markSearch}
              onChange={(event) => setMarkSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{editingMarkId ? 'Edit Marks' : 'Add Marks'}</h2>
        {!selectedExam ? (
          <p>Select an exam to manage marks.</p>
        ) : (
          <>
            <div className="exam-info-card">
              <p>
                <strong>Exam:</strong> {selectedExam.examName}
              </p>
              <p>
                <strong>Class(es):</strong>{' '}
                {selectedExam.examClasses?.length
                  ? selectedExam.examClasses
                      .map((examClass) => `${examClass.classId}-${examClass.sectionId}`)
                      .join(', ')
                  : `${selectedExam.classId}-${selectedExam.sectionId}`}
              </p>
              <p>
                <strong>Academic Year:</strong> {selectedExam.academicYear}
              </p>
              <p>
                <strong>Status:</strong> {selectedExam.status}
              </p>
            </div>

            <form className="student-form" onSubmit={handleMarkSubmit}>
              <label className="field">
                <span>Subject</span>
                <select
                  value={markForm.examSubjectId}
                  onChange={(event) =>
                    setMarkForm({ ...markForm, examSubjectId: event.target.value })
                  }
                  required
                >
                  <option value="">
                    {examSubjects.length ? 'Select subject' : 'No exam subjects available'}
                  </option>
                  {examSubjects.map((examSubject) => (
                    <option key={examSubject._id} value={examSubject._id}>
                      {examSubject.subjectId} (Max {examSubject.totalMarks})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Student</span>
                <select
                  value={markForm.studentId}
                  onChange={(event) =>
                    setMarkForm({ ...markForm, studentId: event.target.value })
                  }
                  required
                >
                  <option value="">
                    {eligibleStudents.length ? 'Select student' : 'No students mapped to class'}
                  </option>
                  {eligibleStudents.map((classStudent) => (
                    <option key={classStudent._id} value={classStudent.student}>
                      {classStudent.studentName} ({classStudent.studentRollNo})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Marks Obtained</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  max={selectedFormExamSubject?.totalMarks}
                  placeholder={
                    selectedFormExamSubject
                      ? `0 - ${selectedFormExamSubject.totalMarks}`
                      : 'e.g. 75'
                  }
                  value={markForm.marksObtained}
                  onChange={(event) =>
                    setMarkForm({ ...markForm, marksObtained: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Remarks (Optional)</span>
                <input
                  placeholder="Optional note"
                  value={markForm.remarks}
                  onChange={(event) =>
                    setMarkForm({ ...markForm, remarks: event.target.value })
                  }
                />
              </label>
              <div className="actions">
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingMarkId ? 'Update Marks' : 'Add Marks'}
                </button>
                {editingMarkId ? (
                  <button type="button" className="secondary" onClick={resetForm}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Bulk Entry (Subject-Wise)</h2>
        {!selectedExam ? (
          <p>Select an exam to enter marks in bulk.</p>
        ) : (
          <>
            <div className="stats-row" style={{ marginBottom: '0.75rem' }}>
              <label className="filter-field">
                <span>Subject</span>
                <select
                  value={bulkSubjectId}
                  onChange={(event) => setBulkSubjectId(event.target.value)}
                >
                  <option value="">
                    {examSubjects.length ? 'Select subject' : 'No exam subjects available'}
                  </option>
                  {examSubjects.map((examSubject) => (
                    <option key={examSubject._id} value={examSubject._id}>
                      {examSubject.subjectId} (Max {examSubject.totalMarks})
                    </option>
                  ))}
                </select>
              </label>
              <div className="actions" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={downloadExcelTemplate}
                  disabled={!selectedExam || !selectedBulkExamSubject}
                >
                  Download Empty Excel
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={!selectedExam || !selectedBulkExamSubject || bulkSubmitting}
                >
                  Upload Filled Excel
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => void handleBulkSave()}
                  disabled={!bulkRows.length || bulkSubmitting}
                >
                  {bulkSubmitting ? 'Saving...' : 'Save All Marks'}
                </button>
              </div>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void uploadExcelSheet(file)
                  }
                }}
              />
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th>Marks</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row) => (
                    <tr key={row.studentId}>
                      <td>{row.studentName}</td>
                      <td>{row.studentRollNo}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          max={selectedBulkExamSubject?.totalMarks}
                          placeholder={
                            selectedBulkExamSubject
                              ? `0 - ${selectedBulkExamSubject.totalMarks}`
                              : 'e.g. 75'
                          }
                          value={row.marksObtained}
                          onChange={(event) =>
                            handleBulkRowChange(
                              row.studentId,
                              'marksObtained',
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          placeholder="Optional note"
                          value={row.remarks}
                          onChange={(event) =>
                            handleBulkRowChange(row.studentId, 'remarks', event.target.value)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  {!bulkRows.length ? (
                    <tr>
                      <td colSpan={4}>
                        {selectedBulkExamSubject
                          ? 'No students mapped to this exam class-section.'
                          : 'Select subject to start bulk entry.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>All Marks</h2>
        <div className="stats-row" style={{ marginBottom: '0.75rem' }}>
          <label className="filter-field">
            <span>Filter Subject</span>
            <select
              value={subjectFilterId}
              onChange={(event) => setSubjectFilterId(event.target.value)}
            >
              <option value="">All Subjects</option>
              {examSubjects.map((examSubject) => (
                <option key={examSubject._id} value={examSubject._id}>
                  {examSubject.subjectId}
                </option>
              ))}
            </select>
          </label>
          {(loading || subjectLoading) && <p>Loading...</p>}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Subject</th>
                <th>Marks</th>
                <th>Pass Marks</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMarks.map((mark) => (
                <tr key={mark._id}>
                  <td>{mark.studentName}</td>
                  <td>{mark.studentRollNo}</td>
                  <td>{mark.subjectId}</td>
                  <td>
                    {mark.marksObtained}
                    {mark.totalMarks !== null ? ` / ${mark.totalMarks}` : ''}
                  </td>
                  <td>{mark.passingMarks ?? '-'}</td>
                  <td>{mark.remarks || '-'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(mark)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleDelete(mark._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredMarks.length && !loading ? (
                <tr>
                  <td colSpan={7}>
                    {examMarks.length ? 'No marks match your filters.' : 'No marks found.'}
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

export default MarksManagementPage

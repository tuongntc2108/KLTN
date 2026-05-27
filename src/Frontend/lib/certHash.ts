const normalizeValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

export async function computeCertificateHash(data: {
  student_id: string
  recipient_name: string
  certificate_name: string
  course_id: string | number | null | undefined
  issued_date: string
}): Promise<string> {
  const source = [
    normalizeValue(data.student_id),
    normalizeValue(data.recipient_name),
    normalizeValue(data.certificate_name),
    normalizeValue(data.course_id),
    normalizeValue(data.issued_date),
  ].join("|")

  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(source))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

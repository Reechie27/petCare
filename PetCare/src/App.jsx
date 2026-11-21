import { useEffect, useMemo, useState } from 'react'
import './App.css'

/* ================================================================== *
 *  PetCareHub – public landing, owner (user) site, admin site
 *  Demo logins:  admin / admin123   ·   john.doe@gmail.com / owner123
 *  (Passwords are stored in plain text in localStorage: demo only.)
 * ================================================================== */
const STORE = 'petcare_db_v3'
const SESSION = 'petcare_session_v3'
const API_BASE = 'http://127.0.0.1:8000/api'

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, '0')
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => toISO(new Date())
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d) }
const dateObj = (iso) => new Date(`${iso}T00:00:00`)
const daysUntil = (iso) => Math.round((dateObj(iso) - dateObj(today())) / 86400000)
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (iso) => (iso ? dateObj(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—')
const fmtDay = (iso) => (iso ? dateObj(iso).toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' }) : '—')
const fmtTime = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`
}
const nextId = (rows, pk) => rows.reduce((max, r) => Math.max(max, r[pk]), 0) + 1
const openDay = (n) => { let d = n; while (dateObj(addDays(d)).getDay() === 0) d++; return addDays(d) } // skips Sundays
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

/* ---------- constants ---------- */
const SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other']
const PET_STATUS = ['Healthy', 'Under Treatment', 'Recovering', 'Critical']
const APPT_STATUS = ['Pending', 'Confirmed', 'Completed', 'Cancelled']
const CATEGORIES = ['Medical', 'Vaccination', 'Grooming', 'Feeding', 'Other']
const CAT_ICON = { Medical: '🩺', Vaccination: '💉', Grooming: '✂️', Feeding: '🥩', Other: '🐾' }
const NEEDS_SYMPTOMS = ['Medical', 'Vaccination']
const SYMPTOMS = ['No symptoms (routine)', 'Vomiting', 'Diarrhea', 'Coughing / sneezing', 'Lethargy', 'Loss of appetite', 'Itching / scratching', 'Limping', 'Fever', 'Eye or ear discharge']
const PET_EMOJI = { Dog: '🐕', Cat: '🐈', Bird: '🦜', Rabbit: '🐇' }
const TONES = {
  Confirmed: 'success', Healthy: 'success', 'Up to Date': 'success',
  Completed: 'info', Recovering: 'info',
  Pending: 'warn', 'Under Treatment': 'warn', 'Due Soon': 'warn',
  Cancelled: 'danger', Critical: 'danger', Overdue: 'danger',
}
const Pill = ({ value }) => <span className={`status-pill ${TONES[value] || 'neutral'}`}>{value}</span>

/* ---------- seed data ---------- */
const buildSeed = () => {
  const services = [
    { service_id: 1, name: 'General Checkup', category: 'Medical', description: 'Comprehensive health examination and consultation.', price: 500, duration: 30, slot_times: '09:00,10:00,11:00,14:00,15:00', capacity: 1 },
    { service_id: 2, name: 'Rabies Vaccination', category: 'Vaccination', description: 'Standard anti-rabies booster immunization.', price: 350, duration: 15, slot_times: '09:00,10:30', capacity: 1 },
    { service_id: 3, name: 'Full Grooming Session', category: 'Grooming', description: 'Bath, coat trim, nail clip and ear cleansing.', price: 750, duration: 60, slot_times: '09:00,13:00', capacity: 1 },
    { service_id: 4, name: 'Feeding & Nutrition Plan', category: 'Feeding', description: 'Diet review and a feeding schedule made for your pet.', price: 300, duration: 30, slot_times: '10:00,14:00,16:00', capacity: 2 },
    { service_id: 5, name: 'Pet Day Care', category: 'Other', description: 'Supervised play, meals and rest while you are away.', price: 450, duration: 240, slot_times: '08:00,13:00', capacity: 3 },
  ]
  const price = (id) => services.find((s) => s.service_id === id).price
  const A = (pet_id, service_id, veterinarian_id, appointment_date, appointment_time, status, symptoms, extra = {}) => ({
    pet_id, service_id, veterinarian_id, appointment_date, appointment_time, status, symptoms,
    food_allergies: 'None', med_allergies: 'None', notes: '', price: price(service_id), ...extra,
  })
  // Reserved slots so the "fully booked" notice is visible straight away.
  const fill = (svc, days, times) => days.flatMap((d) => times.map((t, i) => A((i % 3) + 1, svc, null, openDay(d), t, 'Confirmed', '', { notes: 'Slot reserved.' })))
  const appointments = [
    A(1, 1, 1, openDay(2), '10:00', 'Confirmed', 'Routine annual wellness check', { food_allergies: 'Chicken' }),
    A(2, 1, 2, openDay(3), '14:00', 'Pending', 'Itching / scratching, scratching ears often', { med_allergies: 'Penicillin' }),
    A(3, 3, 1, addDays(-10), '09:00', 'Completed', ''),
    ...fill(2, [0, 1], ['09:00', '10:30']),
    ...fill(3, [1, 2], ['09:00', '13:00']),
  ].map((a, i) => ({ appointment_id: i + 1, ...a }))

  return {
    admins: [{ admin_id: 1, name: 'Clinic Administrator', username: 'admin', password: 'admin123' }],
    owners: [
      { owner_id: 1, first_name: 'John', last_name: 'Doe', phone: '0917-123-4567', email: 'john.doe@gmail.com', address: '123 Mabini St, Manila', password: 'owner123', registration_date: addDays(-300) },
      { owner_id: 2, first_name: 'Maria', last_name: 'Santos', phone: '0920-987-6543', email: 'maria.s@yahoo.com', address: '45 Session Rd, Baguio', password: 'owner123', registration_date: addDays(-250) },
      { owner_id: 3, first_name: 'Alex', last_name: 'Reyes', phone: '0918-555-8899', email: 'alex.reyes@outlook.com', address: '78 Roxas Blvd, Pasay', password: 'owner123', registration_date: addDays(-120) },
    ],
    pets: [
      { pet_id: 1, owner_id: 1, name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', age: 3, weight: 29, color: 'Golden', status: 'Healthy', food_allergies: 'Chicken', med_allergies: 'None' },
      { pet_id: 2, owner_id: 2, name: 'Luna', species: 'Cat', breed: 'Siamese', age: 2, weight: 4, color: 'Cream/Brown', status: 'Healthy', food_allergies: 'None', med_allergies: 'Penicillin' },
      { pet_id: 3, owner_id: 3, name: 'Coco', species: 'Bird', breed: 'Cockatiel', age: 1, weight: 0.1, color: 'Yellow/Grey', status: 'Under Treatment', food_allergies: 'None', med_allergies: 'None' },
    ],
    vets: [
      { veterinarian_id: 1, first_name: 'Dr. Sarah', last_name: 'Gomez', phone: '0919-444-1122', email: 'sarah.gomez@petcare.com', specialization: 'Small Animal Surgery', license_no: 'VET-98231' },
      { veterinarian_id: 2, first_name: 'Dr. Mark', last_name: 'Tan', phone: '0917-333-7711', email: 'mark.tan@petcare.com', specialization: 'Feline Dermatology', license_no: 'VET-65412' },
    ],
    services,
    appointments,
    medical: [
      { record_id: 1, pet_id: 1, veterinarian_id: 1, diagnosis: 'Mild Ear Infection', treatment: 'Ear canal cleaning', prescription: 'Otoclean drops 2x daily', record_date: addDays(-40), notes: 'Re-evaluate in 2 weeks.' },
    ],
    vaccinations: [
      { vaccination_id: 1, pet_id: 1, vaccine_name: 'DHPP Vaccine', date_given: addDays(-335), next_due_date: addDays(30), notes: 'Annual booster complete.' },
      { vaccination_id: 2, pet_id: 2, vaccine_name: 'Rabies Booster', date_given: addDays(-380), next_due_date: addDays(-15), notes: 'No immediate side effects.' },
    ],
    feeding: [
      { feeding_id: 1, pet_id: 1, food_type: 'Dry Kibble', food_brand: 'Royal Canin Adult', quantity: '2 cups', feeding_time: '08:00', notes: 'Mix with warm water.' },
      { feeding_id: 2, pet_id: 2, food_type: 'Wet Food', food_brand: 'Whiskas Salmon', quantity: '1 pouch', feeding_time: '18:00', notes: 'Likes extra broth.' },
    ],
    grooming: [
      { grooming_id: 1, pet_id: 1, grooming_type: 'Full Bath & Haircut', date: addDays(-30), groomer_name: 'Leo Ramos', notes: 'Very cooperative.' },
    ],
  }
}

/* ---------- lookups ---------- */
const NAMERS = {
  owners: (r) => `${r.first_name} ${r.last_name}`,
  pets: (r) => r.name,
  vets: (r) => `${r.first_name} ${r.last_name}`,
  services: (r) => r.name,
}
const PKS = {
  admins: 'admin_id', owners: 'owner_id', pets: 'pet_id', vets: 'veterinarian_id', services: 'service_id',
  appointments: 'appointment_id', medical: 'record_id', vaccinations: 'vaccination_id', feeding: 'feeding_id', grooming: 'grooming_id',
}
const getRow = (db, key, id) => db[key].find((r) => r[PKS[key]] === Number(id))
const getName = (db, key, id) => {
  if (id == null || id === '') return 'Unassigned'
  const row = getRow(db, key, id)
  return row ? NAMERS[key](row) : `#${id}`
}
const optionLabel = (db, key, row) =>
  key === 'pets' ? `${row.name} — ${row.species}, owner: ${getName(db, 'owners', row.owner_id)}` : NAMERS[key](row)
const vaccineState = (v) => {
  const d = daysUntil(v.next_due_date)
  return d < 0 ? 'Overdue' : d <= 30 ? 'Due Soon' : 'Up to Date'
}
const allergyText = (a) => `Food: ${a.food_allergies || 'None'} · Medicine: ${a.med_allergies || 'None'}`

// Parents can't be deleted while children still reference them.
const DEPENDENTS = {
  owners: [['pets', 'owner_id', 'pet(s)']],
  pets: [['appointments', 'pet_id', 'appointment(s)'], ['medical', 'pet_id', 'medical record(s)'], ['vaccinations', 'pet_id', 'vaccination(s)'], ['feeding', 'pet_id', 'feeding log(s)'], ['grooming', 'pet_id', 'grooming log(s)']],
  vets: [['appointments', 'veterinarian_id', 'appointment(s)'], ['medical', 'veterinarian_id', 'medical record(s)']],
  services: [['appointments', 'service_id', 'appointment(s)']],
}
const blockersFor = (db, key, row, pk) =>
  (DEPENDENTS[key] || []).map(([child, fk, label]) => ({ label, n: db[child].filter((r) => r[fk] === row[pk]).length })).filter((b) => b.n > 0)

/* ---------- availability (the clinic is closed on Sundays) ---------- */
const slotsOf = (s) => (s.slot_times || '').split(',').map((x) => x.trim()).filter(Boolean).sort()
const bookedCount = (db, sid, date, time, ignoreId) =>
  db.appointments.filter((a) => a.service_id === sid && a.appointment_date === date && a.appointment_time === time && a.status !== 'Cancelled' && a.appointment_id !== ignoreId).length
const slotState = (db, s, date, time, ignoreId) => {
  if (dateObj(date).getDay() === 0) return 'closed'
  if (date === today() && time <= nowHM()) return 'past'
  return bookedCount(db, s.service_id, date, time, ignoreId) >= (Number(s.capacity) || 1) ? 'full' : 'free'
}
const freeSlots = (db, s, date) => slotsOf(s).filter((t) => slotState(db, s, date, t) === 'free')
const nextAvailable = (db, s, from = 0) => {
  for (let i = from; i < 60; i++) {
    const date = addDays(i)
    const f = freeSlots(db, s, date)
    if (f.length) return { date, time: f[0] }
  }
  return null
}

/* ================================================================== *
 *  Shared UI
 * ================================================================== */
function Modal({ title, subtitle, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function Field({ field, value, error, onChange, db }) {
  const common = { id: field.name, value: value ?? '', onChange: (e) => onChange(field.name, e.target.value) }
  let input
  if (field.type === 'fk') {
    input = (
      <select {...common}>
        <option value="">{field.required ? 'Select' : 'Leave unassigned'}…</option>
        {db[field.ref].map((r) => <option key={r[PKS[field.ref]]} value={r[PKS[field.ref]]}>{optionLabel(db, field.ref, r)}</option>)}
      </select>
    )
  } else if (field.type === 'select') {
    input = <select {...common}>{field.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
  } else if (field.type === 'textarea') {
    input = <textarea rows={3} {...common} />
  } else {
    input = <input type={field.type} min={field.min} step={field.step} placeholder={field.placeholder} {...common} />
  }
  return (
    <div className={`field ${field.full ? 'full' : ''} ${error ? 'has-error' : ''}`}>
      <label htmlFor={field.name}>{field.label}{field.required && <span className="req"> *</span>}</label>
      {input}
      {field.hint && !error && <span className="field-hint">{field.hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

function validateFields(fields, values) {
  const errors = {}
  fields.forEach((f) => {
    const v = values[f.name]
    const empty = v === undefined || v === null || String(v).trim() === ''
    if (f.required && empty) errors[f.name] = 'This field is required.'
    else if (!empty && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.name] = 'Enter a valid email address.'
    else if (!empty && f.type === 'tel' && !/^[0-9+\-\s()]{7,20}$/.test(v)) errors[f.name] = 'Enter a valid phone number.'
    else if (!empty && f.type === 'number') {
      if (Number.isNaN(Number(v))) errors[f.name] = 'Enter a number.'
      else if (f.min !== undefined && Number(v) < f.min) errors[f.name] = `Must be at least ${f.min}.`
    }
  })
  return errors
}

function EntityForm({ entity, row, db, onSave, onClose, subtitle }) {
  const isEdit = row != null
  const [values, setValues] = useState(() => (isEdit ? { ...row } : { ...entity.defaults() }))
  const [errors, setErrors] = useState({})
  const setField = (name, val) => { setValues((p) => ({ ...p, [name]: val })); setErrors((p) => ({ ...p, [name]: undefined })) }

  const submit = (e) => {
    e.preventDefault()
    let errs = validateFields(entity.fields, values)
    if (!Object.keys(errs).length && entity.validate) errs = entity.validate(values, db)
    if (Object.keys(errs).length) return setErrors(errs)
    const clean = { ...values }
    entity.fields.forEach((f) => {
      if (f.type === 'fk' || f.type === 'number') clean[f.name] = clean[f.name] === '' || clean[f.name] == null ? null : Number(clean[f.name])
      else if (typeof clean[f.name] === 'string') clean[f.name] = clean[f.name].trim()
    })
    onSave(clean)
  }

  return (
    <Modal title={`${isEdit ? 'Edit' : 'New'} ${entity.singular.toLowerCase()}`} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          {entity.fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setField} db={db} />)}
        </div>
        <div className="modal-actions">
          <button type="button" className="action-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="action-btn primary">{isEdit ? 'Save changes' : `Add ${entity.singular.toLowerCase()}`}</button>
        </div>
      </form>
    </Modal>
  )
}

function PetProfile({ petId, db, onClose }) {
  const pet = getRow(db, 'pets', petId)
  if (!pet) return null
  const owner = getRow(db, 'owners', pet.owner_id)
  const byPet = (k) => db[k].filter((r) => r.pet_id === petId)
  const appts = byPet('appointments').sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
  const Section = ({ title, rows, children }) => (
    <div className="profile-section">
      <h4>{title} <span className="count-badge">{rows.length}</span></h4>
      {rows.length ? <ul className="profile-list">{children}</ul> : <p className="muted">Nothing recorded yet.</p>}
    </div>
  )
  return (
    <Modal wide title={`${PET_EMOJI[pet.species] || '🐾'} ${pet.name}`} subtitle={`${pet.species}${pet.breed ? `, ${pet.breed}` : ''}${pet.age != null ? `, ${pet.age} yr${pet.age === 1 ? '' : 's'}` : ''}`} onClose={onClose}>
      <div className="profile-top">
        <div><span className="mini-label">Owner</span><strong>{owner ? NAMERS.owners(owner) : '—'}</strong><small className="muted">{owner?.phone}</small></div>
        <div><span className="mini-label">Status</span><Pill value={pet.status} /></div>
        <div><span className="mini-label">Allergies</span><strong className="allergy-line">Food: {pet.food_allergies || 'None'}</strong><strong className="allergy-line">Medicine: {pet.med_allergies || 'None'}</strong></div>
      </div>
      <Section title="Appointments" rows={appts}>
        {appts.map((a) => <li key={a.appointment_id}><span>{fmtDay(a.appointment_date)}, {fmtTime(a.appointment_time)}: {getName(db, 'services', a.service_id)}</span><Pill value={a.status} /></li>)}
      </Section>
      <Section title="Medical records" rows={byPet('medical')}>
        {byPet('medical').map((m) => <li key={m.record_id}><span><strong>{m.diagnosis}</strong>: {m.treatment || 'no treatment noted'}</span><small className="muted">{fmtDate(m.record_date)}</small></li>)}
      </Section>
      <Section title="Vaccinations" rows={byPet('vaccinations')}>
        {byPet('vaccinations').map((v) => <li key={v.vaccination_id}><span>{v.vaccine_name} <small className="muted">next due {fmtDate(v.next_due_date)}</small></span><Pill value={vaccineState(v)} /></li>)}
      </Section>
      <Section title="Feeding" rows={byPet('feeding')}>
        {byPet('feeding').map((f) => <li key={f.feeding_id}><span>{f.food_brand || f.food_type}, {f.quantity}</span><small className="muted">{fmtTime(f.feeding_time)}</small></li>)}
      </Section>
      <Section title="Grooming" rows={byPet('grooming')}>
        {byPet('grooming').map((g) => <li key={g.grooming_id}><span>{g.grooming_type} <small className="muted">{g.groomer_name}</small></span><small className="muted">{fmtDate(g.date)}</small></li>)}
      </Section>
    </Modal>
  )
}

function ServiceCard({ db, s, onBook, bookLabel = 'Book this service' }) {
  const next = nextAvailable(db, s)
  const closedToday = dateObj(today()).getDay() === 0
  const todaySlots = freeSlots(db, s, today())
  return (
    <div className="svc-card">
      <div className="svc-top">
        <span className="svc-icon">{CAT_ICON[s.category] || '🐾'}</span>
        <div><h3>{s.name}</h3><span className="tag">{s.category}</span></div>
      </div>
      <p>{s.description}</p>
      <div className="svc-meta"><strong>{peso(s.price)}</strong><span>{s.duration} min</span></div>
      {next && next.date === today() ? (
        <div className="avail ok"><strong>Available today</strong><span>{todaySlots.map(fmtTime).join(', ')}</span></div>
      ) : next ? (
        <div className="avail full">
          <strong>{closedToday ? 'Clinic closed today' : 'Fully booked today'}</strong>
          <span>Next available: {fmtDay(next.date)} at {fmtTime(next.time)}</span>
        </div>
      ) : (
        <div className="avail full"><strong>Fully booked</strong><span>No openings in the next 60 days.</span></div>
      )}
      <button className="action-btn primary" onClick={() => onBook(s.service_id)}>{bookLabel}</button>
    </div>
  )
}

function BarList({ data, color }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bar-list">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label">{d.label}</span>
          <div className="bar-track"><div className={`bar-fill ${d.color || color}`} style={{ width: `${(d.value / max) * 100}%` }} /></div>
          <span className="bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function DataTable({ entity, rows, db, ctx, onEdit, onDelete, extraActions }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 1 })
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = rows.filter((r) => {
      if (entity.filter && filter && entity.filter.get(r, db) !== filter) return false
      return !q || entity.columns.some((c) => String(c.value(r, db) ?? '').toLowerCase().includes(q))
    })
    if (sort.key) {
      const col = entity.columns.find((c) => c.key === sort.key)
      out = [...out].sort((a, b) => {
        const x = col.value(a, db), y = col.value(b, db)
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir
        return String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true }) * sort.dir
      })
    }
    return out
  }, [rows, db, query, filter, sort, entity])
  const toggleSort = (key) => setSort((p) => (p.key === key ? { key, dir: -p.dir } : { key, dir: 1 }))

  return (
    <>
      <div className="filters-row">
        <div className="search-box flex"><span aria-hidden>🔍</span><input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={entity.searchHint} /></div>
        {entity.filter && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{entity.filter.label}</option>
            {entity.filter.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              {entity.columns.map((c) => (
                <th key={c.key} className="sortable" onClick={() => toggleSort(c.key)}>{c.label}<span className="sort-mark">{sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : ''}</span></th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length ? visible.map((r) => (
              <tr key={r[entity.pk]}>
                <td className="id-cell">#{r[entity.pk]}</td>
                {entity.columns.map((c) => <td key={c.key}>{c.render ? c.render(r, ctx) : (c.value(r, db) || '—')}</td>)}
                <td className="actions-col">
                  {extraActions && extraActions(r)}
                  <button className="mini-btn edit" title="Edit" onClick={() => onEdit(r)}>✎</button>
                  <button className="mini-btn delete" title="Delete" onClick={() => onDelete(r)}>🗑</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={entity.columns.length + 2} className="empty">{rows.length ? 'No records match your search.' : `No ${entity.title.toLowerCase()} yet. Add the first one.`}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="row-count">Showing {visible.length} of {rows.length} record{rows.length === 1 ? '' : 's'}</div>
    </>
  )
}

/* ================================================================== *
 *  Admin entity configuration
 * ================================================================== */
const petCol = {
  key: 'pet', label: 'Pet', value: (r, db) => getName(db, 'pets', r.pet_id),
  render: (r, { db, openPet }) => <button className="link-btn" onClick={() => openPet(r.pet_id)}>{getName(db, 'pets', r.pet_id)}</button>,
}
const vetCol = { key: 'vet', label: 'Veterinarian', value: (r, db) => getName(db, 'vets', r.veterinarian_id) }

const ENTITIES = {
  appointments: {
    singular: 'Appointment', title: 'Appointments', pk: 'appointment_id', noAdd: true,
    searchHint: 'Search pet, owner, service, symptoms…',
    filter: { label: 'All statuses', options: APPT_STATUS, get: (r) => r.status },
    fields: [
      { name: 'veterinarian_id', label: 'Assigned veterinarian', type: 'fk', ref: 'vets' },
      { name: 'appointment_date', label: 'Date', type: 'date', required: true },
      { name: 'appointment_time', label: 'Time', type: 'time', required: true },
      { name: 'status', label: 'Status', type: 'select', options: APPT_STATUS, required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    validate: (v, db) => {
      const s = getRow(db, 'services', v.service_id)
      if (s && v.status !== 'Cancelled' && bookedCount(db, v.service_id, v.appointment_date, v.appointment_time, v.appointment_id) >= (Number(s.capacity) || 1))
        return { appointment_time: 'That slot is already full for this service.' }
      return {}
    },
    columns: [
      petCol,
      { key: 'owner', label: 'Owner', value: (r, db) => getName(db, 'owners', getRow(db, 'pets', r.pet_id)?.owner_id) },
      { key: 'service', label: 'Service', value: (r, db) => getName(db, 'services', r.service_id), render: (r, { db }) => <strong>{CAT_ICON[getRow(db, 'services', r.service_id)?.category]} {getName(db, 'services', r.service_id)}</strong> },
      vetCol,
      { key: 'when', label: 'Date & time', value: (r) => `${r.appointment_date} ${r.appointment_time}`, render: (r) => <>{fmtDay(r.appointment_date)}<br /><small className="muted">{fmtTime(r.appointment_time)}</small></> },
      { key: 'symptoms', label: 'Symptoms', value: (r) => r.symptoms },
      { key: 'allergies', label: 'Allergies', value: (r) => allergyText(r), render: (r) => <small>Food: {r.food_allergies || 'None'}<br />Medicine: {r.med_allergies || 'None'}</small> },
      { key: 'status', label: 'Status', value: (r) => r.status, render: (r) => <Pill value={r.status} /> },
      { key: 'price', label: 'Fee', value: (r) => Number(r.price), render: (r) => <strong>{peso(r.price)}</strong> },
    ],
  },
  services: {
    singular: 'Service', title: 'Services & Availability', addLabel: '+ Add service', pk: 'service_id', searchHint: 'Search services…',
    defaults: () => ({ category: 'Medical', duration: 30, capacity: 1, slot_times: '09:00,10:00,14:00' }),
    fields: [
      { name: 'name', label: 'Service name', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true, hint: 'Medical and Vaccination services ask the owner for symptoms.' },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      { name: 'price', label: 'Price (₱)', type: 'number', min: 0, step: 0.01, required: true },
      { name: 'duration', label: 'Duration (minutes)', type: 'number', min: 1, step: 1, required: true },
      { name: 'slot_times', label: 'Daily time slots', type: 'text', required: true, full: true, placeholder: '09:00,10:30,14:00', hint: 'Comma-separated 24-hour times. When every slot on a day is taken, owners see "Fully booked".' },
      { name: 'capacity', label: 'Bookings allowed per slot', type: 'number', min: 1, step: 1, required: true },
    ],
    validate: (v) => (/^\s*\d{2}:\d{2}(\s*,\s*\d{2}:\d{2})*\s*$/.test(v.slot_times) ? {} : { slot_times: 'Use times like 09:00,10:30,14:00.' }),
    columns: [
      { key: 'name', label: 'Service', value: (r) => r.name, render: (r) => <strong>{CAT_ICON[r.category]} {r.name}</strong> },
      { key: 'category', label: 'Category', value: (r) => r.category, render: (r) => <span className="tag">{r.category}</span> },
      { key: 'price', label: 'Price', value: (r) => Number(r.price), render: (r) => peso(r.price) },
      { key: 'duration', label: 'Duration', value: (r) => Number(r.duration), render: (r) => `${r.duration} min` },
      { key: 'slots', label: 'Daily slots', value: (r) => r.slot_times, render: (r) => slotsOf(r).map(fmtTime).join(', ') },
      { key: 'capacity', label: 'Per slot', value: (r) => Number(r.capacity) },
      {
        key: 'next', label: 'Next opening',
        value: (r, db) => { const n = nextAvailable(db, r); return n ? `${n.date} ${n.time}` : 'none' },
        render: (r, { db }) => { const n = nextAvailable(db, r); return n ? <>{fmtDay(n.date)}<br /><small className="muted">{fmtTime(n.time)}</small></> : <Pill value="Cancelled" /> },
      },
    ],
  },
  vets: {
    singular: 'Veterinarian', title: 'Veterinarians', addLabel: '+ Add veterinarian', pk: 'veterinarian_id', searchHint: 'Search name, specialization, license…',
    defaults: () => ({}),
    fields: [
      { name: 'first_name', label: 'First name', type: 'text', required: true, placeholder: 'Dr. Jane' },
      { name: 'last_name', label: 'Last name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'specialization', label: 'Specialization', type: 'text' },
      { name: 'license_no', label: 'License no.', type: 'text', required: true, placeholder: 'VET-12345' },
    ],
    validate: (v, db) => (db.vets.some((x) => x.license_no.toLowerCase() === v.license_no.trim().toLowerCase() && x.veterinarian_id !== v.veterinarian_id) ? { license_no: 'This license number is already registered.' } : {}),
    columns: [
      { key: 'name', label: 'Doctor', value: (r) => NAMERS.vets(r), render: (r) => <strong>{NAMERS.vets(r)}</strong> },
      { key: 'specialization', label: 'Specialization', value: (r) => r.specialization, render: (r) => (r.specialization ? <span className="tag purple">{r.specialization}</span> : '—') },
      { key: 'license_no', label: 'License', value: (r) => r.license_no },
      { key: 'phone', label: 'Phone', value: (r) => r.phone },
      { key: 'email', label: 'Email', value: (r) => r.email },
      { key: 'load', label: 'Appointments', value: (r, db) => db.appointments.filter((a) => a.veterinarian_id === r.veterinarian_id).length },
    ],
  },
  owners: {
    singular: 'Owner', title: 'Pet Owners', addLabel: '+ Add owner', pk: 'owner_id', searchHint: 'Search name, email or phone…',
    defaults: () => ({ registration_date: today() }),
    fields: [
      { name: 'first_name', label: 'First name', type: 'text', required: true },
      { name: 'last_name', label: 'Last name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '0917-123-4567' },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'address', label: 'Address', type: 'text', full: true },
      { name: 'password', label: 'Login password', type: 'text', required: true },
      { name: 'registration_date', label: 'Registration date', type: 'date', required: true },
    ],
    validate: (v, db) => (db.owners.some((o) => o.email.toLowerCase() === v.email.trim().toLowerCase() && o.owner_id !== v.owner_id) ? { email: 'This email is already registered.' } : {}),
    columns: [
      { key: 'name', label: 'Owner', value: (r) => NAMERS.owners(r), render: (r) => <strong>{NAMERS.owners(r)}</strong> },
      { key: 'pets', label: 'Pets', value: (r, db) => db.pets.filter((p) => p.owner_id === r.owner_id).map((p) => p.name).join(', ') || '—' },
      { key: 'phone', label: 'Phone', value: (r) => r.phone },
      { key: 'email', label: 'Email', value: (r) => r.email },
      { key: 'address', label: 'Address', value: (r) => r.address },
      { key: 'registration_date', label: 'Registered', value: (r) => r.registration_date, render: (r) => fmtDate(r.registration_date) },
    ],
  },
  pets: {
    singular: 'Pet', title: 'Pets Directory', addLabel: '+ Register pet', pk: 'pet_id', searchHint: 'Search pet, breed, owner, allergy…',
    defaults: () => ({ species: 'Dog', status: 'Healthy', food_allergies: 'None', med_allergies: 'None' }),
    fields: [
      { name: 'owner_id', label: 'Owner', type: 'fk', ref: 'owners', required: true },
      { name: 'name', label: 'Pet name', type: 'text', required: true },
      { name: 'species', label: 'Species', type: 'select', options: SPECIES, required: true },
      { name: 'breed', label: 'Breed', type: 'text' },
      { name: 'age', label: 'Age (years)', type: 'number', min: 0, step: 1 },
      { name: 'weight', label: 'Weight (kg)', type: 'number', min: 0, step: 0.1 },
      { name: 'color', label: 'Color', type: 'text' },
      { name: 'status', label: 'Health status', type: 'select', options: PET_STATUS, required: true },
      { name: 'food_allergies', label: 'Food allergies', type: 'text', required: true, hint: 'Type "None" if there are no known allergies.' },
      { name: 'med_allergies', label: 'Medicine allergies', type: 'text', required: true, hint: 'Type "None" if there are no known allergies.' },
    ],
    filter: { label: 'All species', options: SPECIES, get: (r) => r.species },
    columns: [
      { ...petCol, value: (r) => r.name, render: (r, { openPet }) => <button className="link-btn" onClick={() => openPet(r.pet_id)}>{r.name}</button> },
      { key: 'owner', label: 'Owner', value: (r, db) => getName(db, 'owners', r.owner_id) },
      { key: 'species', label: 'Species / breed', value: (r) => `${r.species} ${r.breed || ''}`, render: (r) => `${r.species}${r.breed ? ` (${r.breed})` : ''}` },
      { key: 'age', label: 'Age', value: (r) => r.age ?? 0, render: (r) => (r.age != null ? `${r.age} yr${r.age === 1 ? '' : 's'}` : '—') },
      { key: 'allergies', label: 'Allergies', value: (r) => allergyText(r), render: (r) => <small>Food: {r.food_allergies || 'None'}<br />Medicine: {r.med_allergies || 'None'}</small> },
      { key: 'status', label: 'Status', value: (r) => r.status, render: (r) => <Pill value={r.status} /> },
    ],
  },
  medical: {
    singular: 'Medical record', title: 'Medical Records', addLabel: '+ Add medical record', pk: 'record_id', searchHint: 'Search pet, diagnosis, treatment…',
    defaults: () => ({ record_date: today() }),
    fields: [
      { name: 'pet_id', label: 'Pet', type: 'fk', ref: 'pets', required: true },
      { name: 'veterinarian_id', label: 'Veterinarian', type: 'fk', ref: 'vets', required: true },
      { name: 'diagnosis', label: 'Diagnosis', type: 'text', required: true, full: true },
      { name: 'treatment', label: 'Treatment', type: 'textarea' },
      { name: 'prescription', label: 'Prescription', type: 'textarea' },
      { name: 'record_date', label: 'Record date', type: 'date', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    columns: [
      petCol, vetCol,
      { key: 'diagnosis', label: 'Diagnosis', value: (r) => r.diagnosis, render: (r) => <strong>{r.diagnosis}</strong> },
      { key: 'treatment', label: 'Treatment', value: (r) => r.treatment },
      { key: 'prescription', label: 'Prescription', value: (r) => r.prescription },
      { key: 'record_date', label: 'Date', value: (r) => r.record_date, render: (r) => fmtDate(r.record_date) },
    ],
  },
  vaccinations: {
    singular: 'Vaccination', title: 'Vaccinations', addLabel: '+ Log vaccination', pk: 'vaccination_id', searchHint: 'Search pet or vaccine…',
    defaults: () => ({ date_given: today(), next_due_date: addDays(365) }),
    fields: [
      { name: 'pet_id', label: 'Pet', type: 'fk', ref: 'pets', required: true },
      { name: 'vaccine_name', label: 'Vaccine name', type: 'text', required: true },
      { name: 'date_given', label: 'Date given', type: 'date', required: true },
      { name: 'next_due_date', label: 'Next due date', type: 'date', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    validate: (v) => (v.next_due_date < v.date_given ? { next_due_date: 'Next due date cannot be before the date given.' } : {}),
    filter: { label: 'All statuses', options: ['Overdue', 'Due Soon', 'Up to Date'], get: (r) => vaccineState(r) },
    columns: [
      petCol,
      { key: 'vaccine', label: 'Vaccine', value: (r) => r.vaccine_name, render: (r) => <strong>{r.vaccine_name}</strong> },
      { key: 'date_given', label: 'Given', value: (r) => r.date_given, render: (r) => fmtDate(r.date_given) },
      { key: 'next_due_date', label: 'Next due', value: (r) => r.next_due_date, render: (r) => fmtDate(r.next_due_date) },
      { key: 'state', label: 'Status', value: (r) => vaccineState(r), render: (r) => <Pill value={vaccineState(r)} /> },
      { key: 'notes', label: 'Notes', value: (r) => r.notes },
    ],
  },
  feeding: {
    singular: 'Feeding log', title: 'Feeding Logs', addLabel: '+ Add feeding log', pk: 'feeding_id', searchHint: 'Search pet, food, brand…',
    defaults: () => ({ feeding_time: '08:00' }),
    fields: [
      { name: 'pet_id', label: 'Pet', type: 'fk', ref: 'pets', required: true },
      { name: 'food_type', label: 'Food type', type: 'text', required: true, placeholder: 'Dry Kibble' },
      { name: 'food_brand', label: 'Food brand', type: 'text' },
      { name: 'quantity', label: 'Quantity', type: 'text', placeholder: '2 cups' },
      { name: 'feeding_time', label: 'Feeding time', type: 'time', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    columns: [
      petCol,
      { key: 'food_type', label: 'Food type', value: (r) => r.food_type },
      { key: 'food_brand', label: 'Brand', value: (r) => r.food_brand },
      { key: 'quantity', label: 'Quantity', value: (r) => r.quantity },
      { key: 'feeding_time', label: 'Time', value: (r) => r.feeding_time, render: (r) => fmtTime(r.feeding_time) },
      { key: 'notes', label: 'Notes', value: (r) => r.notes },
    ],
  },
  grooming: {
    singular: 'Grooming log', title: 'Grooming Logs', addLabel: '+ Log grooming', pk: 'grooming_id', searchHint: 'Search pet, type, groomer…',
    defaults: () => ({ date: today() }),
    fields: [
      { name: 'pet_id', label: 'Pet', type: 'fk', ref: 'pets', required: true },
      { name: 'grooming_type', label: 'Grooming type', type: 'text', required: true, placeholder: 'Full Bath & Haircut' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'groomer_name', label: 'Groomer', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    columns: [
      petCol,
      { key: 'grooming_type', label: 'Type', value: (r) => r.grooming_type, render: (r) => <strong>{r.grooming_type}</strong> },
      { key: 'date', label: 'Date', value: (r) => r.date, render: (r) => fmtDate(r.date) },
      { key: 'groomer_name', label: 'Groomer', value: (r) => r.groomer_name },
      { key: 'notes', label: 'Notes', value: (r) => r.notes },
    ],
  },
  admins: {
    singular: 'Admin account', title: 'Admin Accounts', addLabel: '+ Add admin', pk: 'admin_id', searchHint: 'Search admins…',
    defaults: () => ({}),
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: true },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'text', required: true },
    ],
    validate: (v, db) => (db.admins.some((a) => a.username.toLowerCase() === v.username.trim().toLowerCase() && a.admin_id !== v.admin_id) ? { username: 'This username is taken.' } : {}),
    columns: [
      { key: 'name', label: 'Name', value: (r) => r.name, render: (r) => <strong>{r.name}</strong> },
      { key: 'username', label: 'Username', value: (r) => r.username },
    ],
  },
}

const ADMIN_NAV = [
  { label: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', icon: '📊' }] },
  { label: 'Clinic operations', items: [
    { key: 'appointments', label: 'Appointments', icon: '📅' },
    { key: 'services', label: 'Services & availability', icon: '🛎️' },
    { key: 'vets', label: 'Veterinarians', icon: '👨‍⚕️' },
  ] },
  { label: 'Clients', items: [{ key: 'owners', label: 'Pet owners', icon: '👥' }, { key: 'pets', label: 'Pets directory', icon: '🐕' }] },
  { label: 'Pet records', items: [
    { key: 'medical', label: 'Medical records', icon: '🩺' }, { key: 'vaccinations', label: 'Vaccinations', icon: '💉' },
    { key: 'feeding', label: 'Feeding logs', icon: '🥩' }, { key: 'grooming', label: 'Grooming logs', icon: '✂️' },
  ] },
  { label: 'System', items: [{ key: 'admins', label: 'Admin accounts', icon: '🔐' }] },
]

/* ================================================================== *
 *  Admin site
 * ================================================================== */
function AdminSite({ db, setDb, notify, admin, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [modal, setModal] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeModal = () => setModal(null)
  const goTo = (k) => { setTab(k); setMenuOpen(false); closeModal(); window.scrollTo({ top: 0 }) }
  const ctx = { db, openPet: (id) => setModal({ type: 'pet', id }) }

  const saveRecord = (key, values) => {
    const e = ENTITIES[key]
    const isNew = values[e.pk] == null
    setDb((prev) => {
      const rows = prev[key]
      return isNew
        ? { ...prev, [key]: [...rows, { ...values, [e.pk]: nextId(rows, e.pk) }] }
        : { ...prev, [key]: rows.map((r) => (r[e.pk] === values[e.pk] ? values : r)) }
    })
    notify(`${e.singular} ${isNew ? 'added' : 'updated'}.`)
    closeModal()
  }
  const setApptStatus = (id, status) => {
    setDb((p) => ({ ...p, appointments: p.appointments.map((a) => (a.appointment_id === id ? { ...a, status } : a)) }))
    notify(`Appointment #${id} marked ${status.toLowerCase()}.`)
  }
  const requestDelete = (key, row) => {
    const e = ENTITIES[key]
    let blockers = blockersFor(db, key, row, e.pk)
    if (key === 'admins' && (db.admins.length <= 1 || row.admin_id === admin.admin_id))
      blockers = [{ label: db.admins.length <= 1 ? 'the only admin account' : 'your own signed-in account', n: 1 }]
    setModal({ type: 'delete', key, row, blockers })
  }
  const confirmDelete = () => {
    const { key, row } = modal
    setDb((p) => ({ ...p, [key]: p[key].filter((r) => r[ENTITIES[key].pk] !== row[ENTITIES[key].pk]) }))
    notify(`${ENTITIES[key].singular} deleted.`)
    closeModal()
  }

  const stats = useMemo(() => {
    const live = db.appointments.filter((a) => a.status !== 'Cancelled')
    return {
      pending: db.appointments.filter((a) => a.status === 'Pending').sort((a, b) => a.appointment_date.localeCompare(b.appointment_date)),
      upcoming: db.appointments.filter((a) => a.status === 'Confirmed' && a.appointment_date >= today()).sort((a, b) => `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`)),
      alerts: db.vaccinations.filter((v) => vaccineState(v) !== 'Up to Date').sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)),
      earned: db.appointments.filter((a) => a.status === 'Completed').reduce((s, a) => s + Number(a.price), 0),
      booked: live.filter((a) => a.status !== 'Completed').reduce((s, a) => s + Number(a.price), 0),
      byStatus: APPT_STATUS.map((s) => ({ label: s, value: db.appointments.filter((a) => a.status === s).length, color: TONES[s] })),
      demand: db.services.map((s) => ({ label: s.name.split(' ')[0], value: live.filter((a) => a.service_id === s.service_id).length })),
    }
  }, [db])

  const renderDashboard = () => (
    <section className="tab-panel">
      <div className="section-heading"><div><h2>Admin dashboard</h2><p>Live clinic overview · {fmtDate(today())}</p></div></div>
      <div className="stats-grid">
        {[['Owners', db.owners.length, 'amber', 'owners'], ['Pets', db.pets.length, 'teal', 'pets'], ['Veterinarians', db.vets.length, 'purple', 'vets'],
          ['Appointments', db.appointments.length, 'blue', 'appointments'], ['Awaiting approval', stats.pending.length, 'rose', 'appointments'], ['Services', db.services.length, 'green', 'services']].map(([l, v, c, t]) => (
          <button key={l} className="stat-card" onClick={() => goTo(t)}><div className="stat-label">{l}</div><div className={`stat-value ${c}`}>{v}</div></button>
        ))}
      </div>
      <div className="revenue-row">
        <div className="revenue-card"><span className="mini-label">Revenue earned (completed)</span><strong>{peso(stats.earned)}</strong></div>
        <div className="revenue-card alt"><span className="mini-label">Booked, not yet completed</span><strong>{peso(stats.booked)}</strong></div>
      </div>
      <div className="two-column-grid">
        <div className="panel-box">
          <div className="panel-head"><h3>Requests awaiting approval</h3><button onClick={() => goTo('appointments')}>View all</button></div>
          <div className="activity-list">
            {stats.pending.slice(0, 4).map((a) => (
              <div key={a.appointment_id} className="activity-item">
                <div className="activity-copy">
                  <strong>{getName(db, 'pets', a.pet_id)}: {getName(db, 'services', a.service_id)}</strong>
                  <span>{fmtDay(a.appointment_date)}, {fmtTime(a.appointment_time)}</span>
                  {a.symptoms && <span>Symptoms: {a.symptoms}</span>}
                </div>
                <button className="mini-btn ok" title="Confirm" onClick={() => setApptStatus(a.appointment_id, 'Confirmed')}>✔</button>
              </div>
            ))}
            {!stats.pending.length && <p className="muted pad">No pending requests.</p>}
          </div>
        </div>
        <div className="panel-box">
          <div className="panel-head"><h3>Service availability</h3><button onClick={() => goTo('services')}>Manage</button></div>
          <div className="activity-list">
            {db.services.map((s) => {
              const n = nextAvailable(db, s)
              const now = n && n.date === today()
              return (
                <div key={s.service_id} className="activity-item">
                  <div className="activity-copy"><strong>{CAT_ICON[s.category]} {s.name}</strong><span>{n ? (now ? 'Open today' : `Next: ${fmtDay(n.date)}, ${fmtTime(n.time)}`) : 'No openings in 60 days'}</span></div>
                  <span className={`status-pill ${now ? 'success' : 'danger'}`}>{now ? 'Open' : 'Fully booked'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="two-column-grid">
        <div className="panel-box">
          <div className="panel-head"><h3>Vaccination alerts</h3><button onClick={() => goTo('vaccinations')}>View all</button></div>
          <div className="activity-list">
            {stats.alerts.slice(0, 4).map((v) => {
              const d = daysUntil(v.next_due_date)
              return (
                <div key={v.vaccination_id} className="activity-item">
                  <div className="activity-copy"><strong>{getName(db, 'pets', v.pet_id)}: {v.vaccine_name}</strong><span>Due {fmtDate(v.next_due_date)}</span></div>
                  <div className="activity-side"><Pill value={vaccineState(v)} /><small className="muted">{d < 0 ? `${-d} days late` : `in ${d} days`}</small></div>
                </div>
              )
            })}
            {!stats.alerts.length && <p className="muted pad">All vaccinations are up to date.</p>}
          </div>
        </div>
        <div className="panel-box"><div className="panel-head"><h3>Appointments by status</h3></div><BarList data={stats.byStatus} color="neutral" /><div className="panel-head spaced"><h3>Bookings by service</h3></div><BarList data={stats.demand} color="teal" /></div>
      </div>
    </section>
  )

  const renderEntityPage = (key) => {
    const e = ENTITIES[key]
    const missing = key === 'pets' && !db.owners.length ? 'Add an owner first. Every pet belongs to an owner.'
      : ['medical'].includes(key) && (!db.pets.length || !db.vets.length) ? 'Medical records need at least one pet and one veterinarian.'
      : ['vaccinations', 'feeding', 'grooming'].includes(key) && !db.pets.length ? 'Register a pet first.' : null
    return (
      <section className="tab-panel">
        <div className="section-heading">
          <div><h2>{e.title}</h2>{key === 'appointments' && <p>Owners book from their own site. Confirm, reassign or complete requests here.</p>}</div>
          {!e.noAdd && <button className="action-btn primary small" onClick={() => (missing ? notify(missing, 'error') : setModal({ type: 'form', key, row: null }))}>{e.addLabel}</button>}
        </div>
        <DataTable
          entity={e} rows={db[key]} db={db} ctx={ctx}
          onEdit={(row) => setModal({ type: 'form', key, row })}
          onDelete={(row) => requestDelete(key, row)}
          extraActions={key === 'appointments' ? (r) => (<>
            {r.status === 'Pending' && <button className="mini-btn ok" title="Confirm" onClick={() => setApptStatus(r.appointment_id, 'Confirmed')}>✔</button>}
            {r.status === 'Confirmed' && <button className="mini-btn ok" title="Mark completed" onClick={() => setApptStatus(r.appointment_id, 'Completed')}>🏁</button>}
          </>) : null}
        />
      </section>
    )
  }

  const renderModal = () => {
    if (!modal) return null
    if (modal.type === 'pet') return <PetProfile petId={modal.id} db={db} onClose={closeModal} />
    if (modal.type === 'form') return <EntityForm entity={ENTITIES[modal.key]} row={modal.row} db={db} onSave={(v) => saveRecord(modal.key, v)} onClose={closeModal} subtitle={modal.row ? `${ENTITIES[modal.key].singular} #${modal.row[ENTITIES[modal.key].pk]}` : undefined} />
    const e = ENTITIES[modal.key]
    const blocked = modal.blockers.length > 0
    return (
      <Modal title={blocked ? `Can't delete this ${e.singular.toLowerCase()}` : `Delete ${e.singular.toLowerCase()}?`} onClose={closeModal}>
        {blocked ? (<>
          <p>It is still tied to:</p>
          <ul className="blocker-list">{modal.blockers.map((b) => <li key={b.label}><strong>{b.n}</strong> {b.label}</li>)}</ul>
          <p className="muted">Remove or reassign those first.</p>
          <div className="modal-actions"><button className="action-btn dark" onClick={closeModal}>Got it</button></div>
        </>) : (<>
          <p>This cannot be undone.</p>
          <div className="modal-actions"><button className="action-btn ghost" onClick={closeModal}>Cancel</button><button className="action-btn danger" onClick={confirmDelete}>Delete</button></div>
        </>)}
      </Modal>
    )
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-side ${menuOpen ? 'open' : ''}`}>
        <div className="admin-brand"><span className="brand-mark">🐾</span><div><strong>PetCareHub</strong><small>Admin portal</small></div></div>
        <nav>
          {ADMIN_NAV.map((g) => (
            <div key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map((i) => (
                <button key={i.key} className={`nav-btn ${tab === i.key ? 'active' : ''}`} onClick={() => goTo(i.key)}>
                  <span>{i.icon}</span> {i.label}
                  {db[i.key] && <em className="nav-count">{db[i.key].length}</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <button className="action-btn ghost menu-toggle" onClick={() => setMenuOpen((o) => !o)}>☰</button>
          <span className="admin-who">Signed in as <strong>{admin.name}</strong></span>
          <button className="action-btn dark small" onClick={onLogout}>Log out</button>
        </header>
        <main className="admin-content">{tab === 'dashboard' ? renderDashboard() : renderEntityPage(tab)}</main>
      </div>
      {renderModal()}
    </div>
  )
}

/* ================================================================== *
 *  Owner (user) site
 * ================================================================== */
const USER_PET = {
  singular: 'Pet',
  defaults: () => ({ species: 'Dog', food_allergies: 'None', med_allergies: 'None' }),
  fields: [
    { name: 'name', label: 'Pet name', type: 'text', required: true },
    { name: 'species', label: 'Species', type: 'select', options: SPECIES, required: true },
    { name: 'breed', label: 'Breed', type: 'text' },
    { name: 'age', label: 'Age (years)', type: 'number', min: 0, step: 1 },
    { name: 'weight', label: 'Weight (kg)', type: 'number', min: 0, step: 0.1 },
    { name: 'color', label: 'Color', type: 'text' },
    { name: 'food_allergies', label: 'Food allergies', type: 'text', required: true, hint: 'Type "None" if there are no known allergies.' },
    { name: 'med_allergies', label: 'Medicine allergies', type: 'text', required: true, hint: 'Type "None" if there are no known allergies.' },
  ],
}
const USER_PROFILE = {
  singular: 'Profile',
  fields: [
    { name: 'first_name', label: 'First name', type: 'text', required: true },
    { name: 'last_name', label: 'Last name', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'address', label: 'Address', type: 'text', required: true, full: true },
    { name: 'password', label: 'Password', type: 'text', required: true },
  ],
  validate: (v, db) => (db.owners.some((o) => o.email.toLowerCase() === v.email.trim().toLowerCase() && o.owner_id !== v.owner_id) ? { email: 'This email is already registered.' } : {}),
}

function AllergyAsk({ label, hint, value, onChange, error }) {
  return (
    <div className={`allergy-ask ${error ? 'has-error' : ''}`}>
      <strong>{label}</strong>
      <div className="radio-row">
        {[['No', 'No known allergies'], ['Yes', 'Yes, my pet has allergies']].map(([v, t]) => (
          <label key={v} className={`radio ${value.has === v ? 'on' : ''}`}>
            <input type="radio" name={label} checked={value.has === v} onChange={() => onChange({ ...value, has: v })} />{t}
          </label>
        ))}
      </div>
      {value.has === 'Yes' && <input type="text" value={value.text} placeholder={hint} onChange={(e) => onChange({ ...value, text: e.target.value })} />}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

function BookingForm({ db, owner, preset, onSubmit }) {
  const myPets = db.pets.filter((p) => p.owner_id === owner.owner_id)
  const [petId, setPetId] = useState(myPets[0] ? String(myPets[0].pet_id) : 'new')
  const [np, setNp] = useState({ name: '', species: 'Dog', breed: '', age: '', weight: '', color: '' })
  const [serviceId, setServiceId] = useState(preset ? String(preset) : '')
  const [food, setFood] = useState({ has: '', text: '' })
  const [med, setMed] = useState({ has: '', text: '' })
  const [symptoms, setSymptoms] = useState([])
  const [symptomText, setSymptomText] = useState('')
  const [date, setDate] = useState(addDays(0))
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const pet = petId === 'new' ? null : db.pets.find((p) => String(p.pet_id) === petId)
  const service = db.services.find((s) => String(s.service_id) === serviceId)
  const needsSymptoms = service && NEEDS_SYMPTOMS.includes(service.category)

  // Pre-fill allergies from the chosen pet so the owner only has to confirm them.
  useEffect(() => {
    const f = (v) => (!v ? { has: '', text: '' } : v.toLowerCase() === 'none' ? { has: 'No', text: '' } : { has: 'Yes', text: v })
    setFood(f(pet?.food_allergies)); setMed(f(pet?.med_allergies))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId])

  // Jump to the first open day when a service is chosen.
  useEffect(() => {
    if (!service) return
    const n = nextAvailable(db, service)
    if (n) setDate(n.date)
    setTime('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId])

  const clear = (k) => setErrors((p) => ({ ...p, [k]: undefined }))
  const slots = service ? slotsOf(service) : []
  const free = service ? freeSlots(db, service, date) : []
  const nextAfter = service ? nextAvailable(db, service, Math.max(0, daysUntil(date)) + 1) : null
  const strip = Array.from({ length: 10 }, (_, i) => addDays(i))
  const dayInfo = (d) => {
    if (dateObj(d).getDay() === 0) return { k: 'closed', t: 'Closed' }
    const n = freeSlots(db, service, d).length
    return n ? { k: 'open', t: `${n} open` } : { k: 'full', t: 'Full' }
  }

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (petId === 'new') {
      if (!np.name.trim()) er.name = 'Enter your pet\u2019s name.'
      if (np.age !== '' && Number(np.age) < 0) er.age = 'Enter a valid age.'
    }
    if (!service) er.service = 'Choose a service.'
    ;[['food', food, 'foodErr'], ['med', med, 'medErr']].forEach(([, v, k]) => {
      if (!v.has) er[k] = 'Please answer this question.'
      else if (v.has === 'Yes' && !v.text.trim()) er[k] = 'Tell us what your pet is allergic to.'
    })
    if (needsSymptoms && !symptoms.length && !symptomText.trim()) er.symptoms = 'Select at least one symptom or describe it.'
    if (service) {
      if (!date || date < today()) er.date = 'Pick today or a later date.'
      else if (!time) er.time = 'Choose a time slot.'
      else if (slotState(db, service, date, time) !== 'free') er.time = 'That slot was just taken. Pick another.'
      else if (pet && db.appointments.some((a) => a.pet_id === pet.pet_id && a.status !== 'Cancelled' && a.appointment_date === date && a.appointment_time === time)) er.time = `${pet.name} already has an appointment at that time.`
    }
    if (Object.keys(er).length) { setErrors(er); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    onSubmit({
      petId: pet?.pet_id,
      newPet: petId === 'new' ? { name: np.name.trim(), species: np.species, breed: np.breed.trim(), age: np.age === '' ? null : Number(np.age), weight: np.weight === '' ? null : Number(np.weight), color: np.color.trim() } : null,
      food: food.has === 'No' ? 'None' : food.text.trim(),
      med: med.has === 'No' ? 'None' : med.text.trim(),
      appt: {
        service_id: service.service_id, appointment_date: date, appointment_time: time, price: service.price, notes: notes.trim(),
        symptoms: needsSymptoms ? [...symptoms, symptomText.trim()].filter(Boolean).join(', ') : '',
      },
    })
  }

  return (
    <form className="book-form" onSubmit={submit} noValidate>
      {Object.keys(errors).some((k) => errors[k]) && <div className="form-alert">Please fix the highlighted items below.</div>}

      <div className="book-card">
        <h3>1. Your pet</h3>
        <div className="field">
          <label htmlFor="petsel">Which pet is this for?</label>
          <select id="petsel" value={petId} onChange={(e) => setPetId(e.target.value)}>
            {myPets.map((p) => <option key={p.pet_id} value={p.pet_id}>{p.name} ({p.species})</option>)}
            <option value="new">+ Register a new pet</option>
          </select>
        </div>
        {petId === 'new' && (
          <div className="form-grid">
            <div className={`field ${errors.name ? 'has-error' : ''}`}><label>Pet name <span className="req">*</span></label><input value={np.name} onChange={(e) => { setNp({ ...np, name: e.target.value }); clear('name') }} />{errors.name && <span className="field-error">{errors.name}</span>}</div>
            <div className="field"><label>Species</label><select value={np.species} onChange={(e) => setNp({ ...np, species: e.target.value })}>{SPECIES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Breed</label><input value={np.breed} onChange={(e) => setNp({ ...np, breed: e.target.value })} /></div>
            <div className={`field ${errors.age ? 'has-error' : ''}`}><label>Age (years)</label><input type="number" min="0" value={np.age} onChange={(e) => setNp({ ...np, age: e.target.value })} />{errors.age && <span className="field-error">{errors.age}</span>}</div>
            <div className="field"><label>Weight (kg)</label><input type="number" min="0" step="0.1" value={np.weight} onChange={(e) => setNp({ ...np, weight: e.target.value })} /></div>
            <div className="field"><label>Color</label><input value={np.color} onChange={(e) => setNp({ ...np, color: e.target.value })} /></div>
          </div>
        )}
      </div>

      <div className="book-card">
        <h3>2. Service needed</h3>
        <div className="svc-pick">
          {db.services.map((s) => {
            const n = nextAvailable(db, s)
            const openNow = n && n.date === today()
            return (
              <label key={s.service_id} className={`pick ${serviceId === String(s.service_id) ? 'on' : ''}`}>
                <input type="radio" name="service" checked={serviceId === String(s.service_id)} onChange={() => { setServiceId(String(s.service_id)); clear('service') }} />
                <span className="pick-title">{CAT_ICON[s.category]} {s.name}</span>
                <span className="pick-sub">{peso(s.price)} · {s.duration} min</span>
                <span className={`pick-avail ${openNow ? 'ok' : 'full'}`}>{openNow ? 'Available today' : n ? `Fully booked today. Next: ${fmtDay(n.date)}, ${fmtTime(n.time)}` : 'Fully booked'}</span>
              </label>
            )
          })}
        </div>
        {errors.service && <span className="field-error">{errors.service}</span>}
      </div>

      <div className="book-card">
        <h3>3. Allergies</h3>
        <p className="muted">We check this before every treatment, meal plan or product.</p>
        <AllergyAsk label="Does your pet have any food allergies?" hint="e.g. chicken, grains, dairy" value={food} onChange={(v) => { setFood(v); clear('foodErr') }} error={errors.foodErr} />
        <AllergyAsk label="Does your pet have any medicine allergies?" hint="e.g. penicillin, sulfa drugs" value={med} onChange={(v) => { setMed(v); clear('medErr') }} error={errors.medErr} />
      </div>

      {needsSymptoms && (
        <div className="book-card">
          <h3>4. Symptoms</h3>
          <p className="muted">What is {pet?.name || np.name || 'your pet'} showing? Pick all that apply.</p>
          <div className="chip-pick">
            {SYMPTOMS.map((s) => (
              <button type="button" key={s} className={`chip-btn ${symptoms.includes(s) ? 'on' : ''}`} onClick={() => { setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s])); clear('symptoms') }}>{s}</button>
            ))}
          </div>
          <div className="field"><label>Anything else? How long has it been going on?</label><textarea rows={3} value={symptomText} onChange={(e) => { setSymptomText(e.target.value); clear('symptoms') }} /></div>
          {errors.symptoms && <span className="field-error">{errors.symptoms}</span>}
        </div>
      )}

      <div className="book-card">
        <h3>{needsSymptoms ? '5' : '4'}. Date and time</h3>
        {!service ? <p className="muted">Choose a service to see its open dates.</p> : (<>
          <div className="day-strip">
            {strip.map((d) => {
              const info = dayInfo(d)
              return (
                <button type="button" key={d} className={`day ${info.k} ${date === d ? 'on' : ''}`} onClick={() => { setDate(d); setTime(''); clear('date') }}>
                  <small>{dateObj(d).toLocaleDateString('en-PH', { weekday: 'short' })}</small>
                  <strong>{dateObj(d).getDate()}</strong>
                  <em>{info.t}</em>
                </button>
              )
            })}
          </div>
          <div className="field date-field"><label htmlFor="bdate">Or pick another date</label><input id="bdate" type="date" min={today()} value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} /></div>
          {errors.date && <span className="field-error">{errors.date}</span>}
          {date && free.length === 0 && (
            <div className="full-banner">
              <strong>{dateObj(date).getDay() === 0 ? 'The clinic is closed on Sundays.' : `${service.name} is fully booked on ${fmtDay(date)}.`}</strong>
              {nextAfter ? (
                <span>Next available: <b>{fmtDay(nextAfter.date)}</b> at <b>{fmtTime(nextAfter.time)}</b>.{' '}
                  <button type="button" className="link-btn" onClick={() => { setDate(nextAfter.date); setTime(nextAfter.time) }}>Choose that slot</button></span>
              ) : <span>No openings in the next 60 days. Please call the clinic.</span>}
            </div>
          )}
          <div className="slot-row">
            {slots.map((t) => {
              const st = slotState(db, service, date, t)
              return (
                <button type="button" key={t} disabled={st !== 'free'} className={`slot ${time === t ? 'on' : ''} ${st}`} onClick={() => { setTime(t); clear('time') }}>
                  {fmtTime(t)}<small>{st === 'free' ? 'Open' : st === 'full' ? 'Full' : st === 'past' ? 'Passed' : 'Closed'}</small>
                </button>
              )
            })}
          </div>
          {errors.time && <span className="field-error">{errors.time}</span>}
        </>)}
        <div className="field"><label>Notes for the clinic (optional)</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>

      <div className="book-submit">
        <span>{service ? <>Estimated fee: <strong>{peso(service.price)}</strong></> : 'Choose a service to see the fee.'}</span>
        <button type="submit" className="action-btn primary">Request appointment</button>
      </div>
    </form>
  )
}

function UserSite({ db, setDb, notify, owner, onLogout }) {
  const [tab, setTab] = useState('services')
  const [preset, setPreset] = useState(null)
  const [modal, setModal] = useState(null)
  const closeModal = () => setModal(null)
  const myPets = db.pets.filter((p) => p.owner_id === owner.owner_id)
  const petIds = myPets.map((p) => p.pet_id)
  const myAppts = db.appointments.filter((a) => petIds.includes(a.pet_id)).sort((a, b) => `${b.appointment_date}${b.appointment_time}`.localeCompare(`${a.appointment_date}${a.appointment_time}`))
  const goBook = (sid = null) => { setPreset(sid); setTab('book'); window.scrollTo({ top: 0 }) }

  const book = ({ petId, newPet, food, med, appt }) => {
    setDb((prev) => {
      let pets = prev.pets
      let pid = petId
      if (newPet) { pid = nextId(pets, 'pet_id'); pets = [...pets, { ...newPet, pet_id: pid, owner_id: owner.owner_id, status: 'Healthy', food_allergies: food, med_allergies: med }] }
      else pets = pets.map((p) => (p.pet_id === pid ? { ...p, food_allergies: food, med_allergies: med } : p))
      const a = { ...appt, appointment_id: nextId(prev.appointments, 'appointment_id'), pet_id: pid, veterinarian_id: null, food_allergies: food, med_allergies: med, status: 'Pending' }
      return { ...prev, pets, appointments: [...prev.appointments, a] }
    })
    notify('Request sent. The clinic will confirm your appointment.')
    setTab('appointments')
    window.scrollTo({ top: 0 })
  }
  const savePet = (values) => {
    setDb((prev) => {
      if (values.pet_id == null) return { ...prev, pets: [...prev.pets, { ...values, pet_id: nextId(prev.pets, 'pet_id'), owner_id: owner.owner_id, status: 'Healthy' }] }
      return { ...prev, pets: prev.pets.map((p) => (p.pet_id === values.pet_id ? values : p)) }
    })
    notify(values.pet_id == null ? 'Pet registered.' : 'Pet updated.')
    closeModal()
  }
  const removePet = (p) => {
    if (blockersFor(db, 'pets', p, 'pet_id').length) return notify(`${p.name} has appointments or records, so it can't be removed.`, 'error')
    if (!window.confirm(`Remove ${p.name}?`)) return
    setDb((prev) => ({ ...prev, pets: prev.pets.filter((x) => x.pet_id !== p.pet_id) }))
    notify(`${p.name} removed.`)
  }
  const cancelAppt = (a) => {
    if (!window.confirm('Cancel this appointment?')) return
    setDb((prev) => ({ ...prev, appointments: prev.appointments.map((x) => (x.appointment_id === a.appointment_id ? { ...x, status: 'Cancelled' } : x)) }))
    notify('Appointment cancelled.')
  }
  const saveProfile = (values) => { setDb((prev) => ({ ...prev, owners: prev.owners.map((o) => (o.owner_id === values.owner_id ? values : o)) })); notify('Profile updated.'); closeModal() }

  const NAV = [['services', 'Services'], ['book', 'Book a service'], ['pets', 'My pets'], ['appointments', 'My appointments'], ['profile', 'My profile']]

  return (
    <div className="user-shell">
      <header className="user-header">
        <div className="container user-header-inner">
          <span className="brand"><span className="brand-mark">🐾</span><span className="brand-title">PetCare<span className="brand-accent">Hub</span></span></span>
          <nav className="user-nav">
            {NAV.map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => (k === 'book' ? goBook() : setTab(k))}>{l}</button>)}
          </nav>
          <div className="user-who"><span>Hi, {owner.first_name}</span><button className="action-btn ghost small" onClick={onLogout}>Log out</button></div>
        </div>
      </header>

      <main className="container user-main">
        {tab === 'services' && (
          <section className="tab-panel">
            <div className="section-heading"><div><h2>Our services</h2><p>Live availability. Fully booked services show the next open day and time.</p></div></div>
            <div className="svc-grid">{db.services.map((s) => <ServiceCard key={s.service_id} db={db} s={s} onBook={goBook} />)}</div>
          </section>
        )}

        {tab === 'book' && (
          <section className="tab-panel">
            <div className="section-heading"><div><h2>Book a service</h2><p>Tell us about your pet and what it needs. The clinic confirms every request.</p></div></div>
            <BookingForm key={preset ?? 'none'} db={db} owner={owner} preset={preset} onSubmit={book} />
          </section>
        )}

        {tab === 'pets' && (
          <section className="tab-panel">
            <div className="section-heading"><div><h2>My pets</h2><p>Keep allergy details current. We use them at every visit.</p></div>
              <button className="action-btn primary small" onClick={() => setModal({ type: 'pet', row: null })}>+ Register pet</button></div>
            {myPets.length ? (
              <div className="pet-grid">
                {myPets.map((p) => (
                  <div className="pet-card" key={p.pet_id}>
                    <div className="pet-head"><span className="pet-emoji">{PET_EMOJI[p.species] || '🐾'}</span><div><h3>{p.name}</h3><small className="muted">{p.species}{p.breed ? `, ${p.breed}` : ''}{p.age != null ? `, ${p.age} yr${p.age === 1 ? '' : 's'}` : ''}</small></div><Pill value={p.status} /></div>
                    <div className="allergy-box">
                      <span>Food allergies: <strong>{p.food_allergies || 'None'}</strong></span>
                      <span>Medicine allergies: <strong>{p.med_allergies || 'None'}</strong></span>
                    </div>
                    <div className="pet-actions">
                      <button className="action-btn primary small" onClick={() => setModal({ type: 'view', id: p.pet_id })}>Health record</button>
                      <button className="action-btn light small" onClick={() => setModal({ type: 'pet', row: p })}>Edit</button>
                      <button className="action-btn light small" onClick={() => { setPreset(null); setTab('book') }}>Book</button>
                      <button className="action-btn ghost small" onClick={() => removePet(p)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-card"><p>No pets yet. Register one here, or while booking a service.</p></div>}
          </section>
        )}

        {tab === 'appointments' && (
          <section className="tab-panel">
            <div className="section-heading"><div><h2>My appointments</h2><p>Pending requests are waiting for the clinic to confirm.</p></div><button className="action-btn primary small" onClick={() => goBook()}>+ Book a service</button></div>
            {myAppts.length ? (
              <div className="appt-list">
                {myAppts.map((a) => {
                  const svc = getRow(db, 'services', a.service_id)
                  const upcoming = a.appointment_date >= today() && ['Pending', 'Confirmed'].includes(a.status)
                  return (
                    <div className="appt-card" key={a.appointment_id}>
                      <div className="appt-date"><small>{dateObj(a.appointment_date).toLocaleDateString('en-PH', { weekday: 'short' })}</small><strong>{dateObj(a.appointment_date).getDate()}</strong><small>{dateObj(a.appointment_date).toLocaleDateString('en-PH', { month: 'short' })}</small></div>
                      <div className="appt-body">
                        <h3>{CAT_ICON[svc?.category]} {svc?.name} <small className="muted">for {getName(db, 'pets', a.pet_id)}</small></h3>
                        <span>{fmtDay(a.appointment_date)} at {fmtTime(a.appointment_time)} · Vet: {getName(db, 'vets', a.veterinarian_id)}</span>
                        {a.symptoms && <span>Symptoms: {a.symptoms}</span>}
                        <span>{allergyText(a)}</span>
                      </div>
                      <div className="appt-side"><Pill value={a.status} /><strong>{peso(a.price)}</strong>{upcoming && <button className="link-btn" onClick={() => cancelAppt(a)}>Cancel</button>}</div>
                    </div>
                  )
                })}
              </div>
            ) : <div className="empty-card"><p>No appointments yet.</p><button className="action-btn primary" onClick={() => goBook()}>Book your first service</button></div>}
          </section>
        )}

        {tab === 'profile' && (
          <section className="tab-panel">
            <div className="section-heading"><div><h2>My profile</h2><p>Your personal details on file.</p></div><button className="action-btn primary small" onClick={() => setModal({ type: 'profile' })}>Edit details</button></div>
            <div className="panel-box profile-card">
              {[['Name', NAMERS.owners(owner)], ['Email', owner.email], ['Phone', owner.phone], ['Address', owner.address], ['Member since', fmtDate(owner.registration_date)]].map(([l, v]) => <div key={l}><span className="mini-label">{l}</span><strong>{v}</strong></div>)}
            </div>
          </section>
        )}
      </main>

      {modal?.type === 'pet' && <EntityForm entity={USER_PET} row={modal.row} db={db} onSave={savePet} onClose={closeModal} />}
      {modal?.type === 'profile' && <EntityForm entity={USER_PROFILE} row={owner} db={db} onSave={saveProfile} onClose={closeModal} />}
      {modal?.type === 'view' && <PetProfile petId={modal.id} db={db} onClose={closeModal} />}
    </div>
  )
}

/* ================================================================== *
 *  Public landing + authentication
 * ================================================================== */
function Landing({ db, go }) {
  return (
    <div className="landing">
      <header className="top-header">
        <div className="container header-inner">
          <span className="brand"><span className="brand-mark">🐾</span><span><span className="brand-title">PetCare<span className="brand-accent">Hub</span></span><span className="brand-subtitle">Veterinary clinic</span></span></span>
          <div className="header-actions">
            <button className="action-btn ghost" onClick={() => go('login')}>Log in</button>
            <button className="action-btn primary" onClick={() => go('register')}>Create account</button>
          </div>
        </div>
      </header>
      <div className="container landing-body">
        <div className="hero-panel">
          <div className="hero-copy">
            <h1>Book your pet&rsquo;s care without the phone calls.</h1>
            <p>Check, groom, vaccinate and feed: pick a service, see exactly which days and times are open, and tell us about your pet&rsquo;s allergies and symptoms before you arrive.</p>
            <div className="hero-actions">
              <button className="action-btn dark" onClick={() => go('register')}>Register as a pet owner</button>
              <button className="action-btn light" onClick={() => go('login')}>I already have an account</button>
            </div>
          </div>
          <div className="paw-mark">🐾</div>
        </div>

        <h2 className="land-h">Services and today&rsquo;s availability</h2>
        <div className="svc-grid">{db.services.map((s) => <ServiceCard key={s.service_id} db={db} s={s} onBook={() => go('login')} bookLabel="Log in to book" />)}</div>

        <h2 className="land-h">How booking works</h2>
        <div className="steps-row">
          {[['Create an account', 'Add your name, phone, email and address.'], ['Tell us about your pet', 'Register your pet, pick the service and answer allergy questions.'], ['Add symptoms if needed', 'Vaccinations and medical visits ask what your pet is showing.'], ['Pick an open slot', 'Full days are marked, with the next open date and time.']].map(([t, d], i) => (
            <div className="step" key={t}><span>{i + 1}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </div>
      <footer className="land-footer"><span>© PetCareHub clinic system</span><button className="link-btn" onClick={() => go('admin')}>Staff and admin login</button></footer>
    </div>
  )
}

const REG_F = [
  { name: 'first_name', label: 'First name', type: 'text', required: true },
  { name: 'last_name', label: 'Last name', type: 'text', required: true },
  { name: 'phone', label: 'Phone number', type: 'tel', required: true, placeholder: '0917-123-4567' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'address', label: 'Home address', type: 'text', required: true, full: true },
  { name: 'password', label: 'Password', type: 'password', required: true, hint: 'At least 6 characters.' },
  { name: 'confirm', label: 'Confirm password', type: 'password', required: true },
]
const LOGIN_F = [{ name: 'email', label: 'Email', type: 'email', required: true, full: true }, { name: 'password', label: 'Password', type: 'password', required: true, full: true }]
const ADMIN_F = [{ name: 'username', label: 'Username', type: 'text', required: true, full: true }, { name: 'password', label: 'Password', type: 'password', required: true, full: true }]

function AuthScreen({ mode, db, go, onOwnerLogin, onRegister, onAdminLogin }) {
  const fields = mode === 'register' ? REG_F : mode === 'admin' ? ADMIN_F : LOGIN_F
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const set = (n, v) => { setValues((p) => ({ ...p, [n]: v })); setErrors((p) => ({ ...p, [n]: undefined })) }
  const titles = { login: ['Welcome back', 'Log in to book services and manage your pets.'], register: ['Create your account', 'We need a few personal details to set up your pet owner profile.'], admin: ['Admin portal', 'For clinic staff who manage the system.'] }

  const submit = (e) => {
    e.preventDefault()
    const errs = validateFields(fields, values)
    if (!Object.keys(errs).length) {
      if (mode === 'register') {
        if (values.password.length < 6) errs.password = 'Use at least 6 characters.'
        else if (values.password !== values.confirm) errs.confirm = 'Passwords do not match.'
        else if (db.owners.some((o) => o.email.toLowerCase() === values.email.trim().toLowerCase())) errs.email = 'An account with this email already exists.'
      } else if (!(mode === 'admin' ? onAdminLogin(values.username, values.password) : onOwnerLogin(values.email, values.password))) errs.password = 'Incorrect login details.'
    }
    if (Object.keys(errs).length) return setErrors(errs)
    if (mode === 'register') onRegister(values)
  }

  return (
    <div className={`auth-page ${mode === 'admin' ? 'admin' : ''}`}>
      <form className="auth-card" onSubmit={submit} noValidate>
        <button type="button" className="link-btn back" onClick={() => go('landing')}>← Back to home</button>
        <h2>{titles[mode][0]}</h2>
        <p className="muted">{titles[mode][1]}</p>
        <div className="form-grid">{fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={set} db={db} />)}</div>
        <button type="submit" className="action-btn primary wide-btn">{mode === 'register' ? 'Create account' : 'Log in'}</button>
        {mode === 'login' && <p className="auth-alt">New here? <button type="button" className="link-btn" onClick={() => go('register')}>Create an account</button><br /><small className="muted">Demo: john.doe@gmail.com / owner123</small></p>}
        {mode === 'register' && <p className="auth-alt">Already registered? <button type="button" className="link-btn" onClick={() => go('login')}>Log in</button></p>}
        {mode === 'admin' && <p className="auth-alt"><small className="muted">Demo: admin / admin123</small></p>}
      </form>
    </div>
  )
}

/* ================================================================== *
 *  App
 * ================================================================== */
function App() {
  const [db, setDb] = useState(() => {
    try { const saved = window.localStorage.getItem(STORE); if (saved) return { ...buildSeed(), ...JSON.parse(saved) } } catch { /* use seed */ }
    return buildSeed()
  })
  const [session, setSession] = useState(() => { try { return JSON.parse(window.localStorage.getItem(SESSION)) } catch { return null } })
  const [view, setView] = useState('landing')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadRemoteDb = async () => {
      try {
        const [petsRes, appointmentsRes] = await Promise.all([
          fetch(`${API_BASE}/pets`),
          fetch(`${API_BASE}/appointments`),
        ])

        if (cancelled) return

        const pets = petsRes.ok ? await petsRes.json() : null
        const appointments = appointmentsRes.ok ? await appointmentsRes.json() : null

        if (!pets && !appointments) return

        const seed = buildSeed()
        setDb({
          ...seed,
          pets: Array.isArray(pets) && pets.length ? pets : seed.pets,
          appointments: Array.isArray(appointments) && appointments.length ? appointments : seed.appointments,
        })
      } catch {
        // backend is not running yet; keep using local demo data
      }
    }

    loadRemoteDb()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { try { window.localStorage.setItem(STORE, JSON.stringify(db)) } catch { /* storage unavailable */ } }, [db])
  useEffect(() => { try { window.localStorage.setItem(SESSION, JSON.stringify(session)) } catch { /* storage unavailable */ } }, [session])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(t)
  }, [toast])

  const notify = (msg, tone = 'ok') => setToast({ msg, tone })
  const logout = () => { setSession(null); setView('landing'); window.scrollTo({ top: 0 }) }
  const go = (v) => { setView(v); window.scrollTo({ top: 0 }) }

  const owner = session?.role === 'owner' ? db.owners.find((o) => o.owner_id === session.id) : null
  const admin = session?.role === 'admin' ? db.admins.find((a) => a.admin_id === session.id) : null

  const onOwnerLogin = (email, pw) => {
    const o = db.owners.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === pw)
    if (o) setSession({ role: 'owner', id: o.owner_id })
    return !!o
  }
  const onAdminLogin = (user, pw) => {
    const a = db.admins.find((x) => x.username.toLowerCase() === user.trim().toLowerCase() && x.password === pw)
    if (a) setSession({ role: 'admin', id: a.admin_id })
    return !!a
  }
  const onRegister = (v) => {
    const id = nextId(db.owners, 'owner_id')
    setDb((p) => ({ ...p, owners: [...p.owners, { owner_id: id, first_name: v.first_name.trim(), last_name: v.last_name.trim(), phone: v.phone.trim(), email: v.email.trim(), address: v.address.trim(), password: v.password, registration_date: today() }] }))
    setSession({ role: 'owner', id })
    notify('Account created. Welcome to PetCareHub!')
  }

  let screen
  if (admin) screen = <AdminSite db={db} setDb={setDb} notify={notify} admin={admin} onLogout={logout} />
  else if (owner) screen = <UserSite db={db} setDb={setDb} notify={notify} owner={owner} onLogout={logout} />
  else if (view === 'landing') screen = <Landing db={db} go={go} />
  else screen = <AuthScreen key={view} mode={view} db={db} go={go} onOwnerLogin={onOwnerLogin} onRegister={onRegister} onAdminLogin={onAdminLogin} />

  return (
    <div className="petcare-app">
      {screen}
      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.msg}</div>}
    </div>
  )
}

export default App

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const emptyForm = { companyName:'', role:'', description:'', jobType:'placement', location:'', salary:'', applicationDeadline:'', driveDate:'', status:'active', eligibility: { minCGPA:0, minAMCAT:0, departments:'', batch:'' } };

const DEPTS = ['CSE','IT','ECE','EEE','ME','CE','MBA','MCA','Other'];

export default function OpportunitiesAdmin() {
  const [opps, setOpps]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOpps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/opportunities', { params: { limit: 50 } });
      setOpps(res.data.opportunities);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchOpps(); }, []);

  const openCreate = () => { setForm(emptyForm); setSelected(null); setModal('form'); };
  const openEdit = (o) => {
    setSelected(o);
    setForm({
      ...o,
      applicationDeadline: o.applicationDeadline ? o.applicationDeadline.slice(0,10) : '',
      driveDate: o.driveDate ? o.driveDate.slice(0,10) : '',
      eligibility: { ...o.eligibility, departments: (o.eligibility?.departments || []).join(', ') }
    });
    setModal('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      eligibility: {
        ...form.eligibility,
        minCGPA: parseFloat(form.eligibility.minCGPA) || 0,
        minAMCAT: parseFloat(form.eligibility.minAMCAT) || 0,
        departments: form.eligibility.departments ? form.eligibility.departments.split(',').map(d => d.trim()).filter(Boolean) : []
      }
    };
    try {
      if (selected) {
        await api.put(`/opportunities/${selected._id}`, payload);
        toast.success('Opportunity updated.');
      } else {
        const res = await api.post('/opportunities', payload);
        toast.success(`Opportunity posted. ${res.data.notified} students notified.`);
      }
      setModal(null);
      fetchOpps();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this opportunity?')) return;
    await api.delete(`/opportunities/${id}`);
    toast.success('Deleted.');
    fetchOpps();
  };

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setE = (key, val) => setForm(p => ({ ...p, eligibility: { ...p.eligibility, [key]: val } }));

  const statusColors = { active:'bg-green-100 text-green-700', upcoming:'bg-blue-100 text-blue-700', closed:'bg-gray-100 text-gray-600' };
  const jobTypeColors = { placement:'bg-violet-100 text-violet-700', internship:'bg-amber-100 text-amber-700', both:'bg-teal-100 text-teal-700' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500 mt-1">{total} opportunities posted</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Post Opportunity</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {opps.map(o => (
            <div key={o._id} className="card p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 text-base">{o.companyName}</div>
                  <div className="text-sm text-gray-500">{o.role}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${statusColors[o.status]}`}>{o.status}</span>
                  <span className={`badge ${jobTypeColors[o.jobType]}`}>{o.jobType}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">📍 {o.location || 'Not specified'}</span>
                <span className="flex items-center gap-1">💰 {o.salary || 'Not disclosed'}</span>
              </div>

              <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs space-y-1">
                <div className="font-medium text-gray-700 mb-1">Eligibility</div>
                <div className="flex gap-3">
                  <span>Min CGPA: <strong>{o.eligibility?.minCGPA || 0}</strong></span>
                  {o.eligibility?.minAMCAT > 0 && <span>AMCAT: <strong>{o.eligibility.minAMCAT}</strong></span>}
                </div>
                {o.eligibility?.departments?.length > 0 && (
                  <div>Depts: {o.eligibility.departments.join(', ')}</div>
                )}
              </div>

              <div className="text-xs text-gray-400 flex justify-between">
                <span>{o.totalApplications} applications</span>
                {o.applicationDeadline && <span>Due: {new Date(o.applicationDeadline).toLocaleDateString()}</span>}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(o)} className="btn-secondary text-xs flex-1 py-1.5">Edit</button>
                <button onClick={() => handleDelete(o._id)} className="btn-danger text-xs px-3 py-1.5">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={selected ? 'Edit Opportunity' : 'Post New Opportunity'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
                <input className="input text-sm" required value={form.companyName} onChange={e => setF('companyName', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Role / Position *</label>
                <input className="input text-sm" required value={form.role} onChange={e => setF('role', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <textarea className="input text-sm h-24 resize-none" required value={form.description} onChange={e => setF('description', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Type</label>
                <select className="input text-sm" value={form.jobType} onChange={e => setF('jobType', e.target.value)}>
                  <option value="placement">Placement</option>
                  <option value="internship">Internship</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select className="input text-sm" value={form.status} onChange={e => setF('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <input className="input text-sm" value={form.location} onChange={e => setF('location', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salary / CTC</label>
                <input className="input text-sm" value={form.salary} onChange={e => setF('salary', e.target.value)} placeholder="e.g. 8 LPA" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Application Deadline</label>
                <input className="input text-sm" type="date" value={form.applicationDeadline} onChange={e => setF('applicationDeadline', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Drive Date</label>
                <input className="input text-sm" type="date" value={form.driveDate} onChange={e => setF('driveDate', e.target.value)} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-sm font-semibold text-gray-800 mb-3">Eligibility Criteria</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Minimum CGPA</label>
                  <input className="input text-sm" type="number" min="0" max="10" step="0.1" value={form.eligibility.minCGPA} onChange={e => setE('minCGPA', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Minimum AMCAT</label>
                  <input className="input text-sm" type="number" min="0" value={form.eligibility.minAMCAT} onChange={e => setE('minAMCAT', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Eligible Departments (comma-separated, leave blank for all)</label>
                  <input className="input text-sm" value={form.eligibility.departments} onChange={e => setE('departments', e.target.value)} placeholder="e.g. CSE, IT, ECE" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Batch (leave blank for all)</label>
                  <input className="input text-sm" value={form.eligibility.batch} onChange={e => setE('batch', e.target.value)} placeholder="e.g. 2024" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{selected ? 'Save Changes' : 'Post Opportunity'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

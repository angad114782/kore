import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Mail, MessageCircle, Bell, Save, TestTube2, Eye, EyeOff,
  Loader2, X, ChevronDown, ChevronUp, Check, Package,
  IndianRupee, Users, BookOpen, ClipboardList, ShieldCheck,
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('kore_token')}` });

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  manager:    'Manager',
  investor:   'Investor',
};
const ALL_ROLES = ['superadmin', 'admin', 'manager', 'investor'];

const GROUP_META: Record<string, { icon: React.ReactNode; color: string }> = {
  'System & Auth':           { icon: <ShieldCheck size={13} />,  color: 'text-violet-500' },
  'Orders':                  { icon: <Package size={13} />,      color: 'text-indigo-500' },
  'Payments':                { icon: <IndianRupee size={13} />,  color: 'text-emerald-500' },
  'Distributors':            { icon: <Users size={13} />,        color: 'text-amber-500' },
  'Catalogue & Stock':       { icon: <BookOpen size={13} />,     color: 'text-rose-500' },
  'Purchase Orders & GRN':   { icon: <ClipboardList size={13} />,color: 'text-blue-500' },
};

interface Rule {
  event: string;
  label: string;
  emailEnabled: boolean;
  emailRoles: string[];
  emailDistributor: boolean;
  waEnabled: boolean;
  waRoles: string[];
  waDistributor: boolean;
  waTemplate: string;
  waLanguage: string;
}

interface EventGroup { group: string; events: { event: string; label: string; waTemplate: string }[] }

interface Config {
  emailEnabled: boolean;
  smtpHost: string; smtpPort: number; smtpSecure: boolean;
  smtpUser: string; smtpPass: string; smtpFromName: string; smtpFromEmail: string;
  waEnabled: boolean; waToken: string; waPhoneNumberId: string; waBusinessAccountId: string;
  rules: Rule[];
}

const defaultConfig: Config = {
  emailEnabled: false, smtpHost: '', smtpPort: 587, smtpSecure: false,
  smtpUser: '', smtpPass: '', smtpFromName: 'Kore Kollective', smtpFromEmail: '',
  waEnabled: false, waToken: '', waPhoneNumberId: '', waBusinessAccountId: '',
  rules: [],
};

export default function NotificationSettings() {
  const [tab, setTab] = useState<'email' | 'whatsapp' | 'rules'>('email');
  const [cfg, setCfg] = useState<Config>(defaultConfig);
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [testWaPhone, setTestWaPhone] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/notifications/config`, { headers: authHeaders() }),
      axios.get(`${API}/notifications/events`, { headers: authHeaders() }),
    ]).then(([cfgRes, evRes]) => {
      setCfg(cfgRes.data.data);
      setGroups(evRes.data.groups || []);
    }).catch(() => toast.error('Failed to load notification config'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await axios.put(`${API}/notifications/config`, cfg, { headers: authHeaders() });
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const testEmail = async () => {
    try {
      setTesting(true);
      const r = await axios.post(`${API}/notifications/test-email`, {}, { headers: authHeaders() });
      toast.success(r.data.message);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Test failed');
    } finally { setTesting(false); }
  };

  const testWa = async () => {
    try {
      setTesting(true);
      const r = await axios.post(`${API}/notifications/test-wa`, { phone: testWaPhone }, { headers: authHeaders() });
      toast.success(r.data.message);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Test failed');
    } finally { setTesting(false); }
  };

  const setField = (key: keyof Config, val: any) => setCfg(p => ({ ...p, [key]: val }));

  const setRule = (event: string, patch: Partial<Rule>) =>
    setCfg(p => ({ ...p, rules: p.rules.map(r => r.event === event ? { ...r, ...patch } : r) }));

  const toggleRole = (event: string, field: 'emailRoles' | 'waRoles', role: string) => {
    const rule = cfg.rules.find(r => r.event === event);
    if (!rule) return;
    const arr = rule[field] || [];
    setRule(event, { [field]: arr.includes(role) ? arr.filter(x => x !== role) : [...arr, role] });
  };

  const ruleFor = (event: string) => cfg.rules.find(r => r.event === event);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>;

  const TABS = [
    { id: 'email',    icon: <Mail size={14} />,         label: 'Email / SMTP'    },
    { id: 'whatsapp', icon: <MessageCircle size={14} />, label: 'WhatsApp'        },
    { id: 'rules',    icon: <Bell size={14} />,          label: 'Notification Rules' },
  ] as const;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notification Settings</h2>
          <p className="text-xs text-slate-400 font-medium">Email (SMTP) + WhatsApp Cloud API — SuperAdmin only</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save All Settings
        </button>
      </div>

      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── EMAIL TAB ── */}
      {tab === 'email' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Mail size={15} className="text-indigo-500" /> SMTP Configuration</p>
            <Toggle value={cfg.emailEnabled} onChange={v => setField('emailEnabled', v)} color="indigo" label={cfg.emailEnabled ? 'Enabled' : 'Disabled'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'SMTP Host',            key: 'smtpHost',      placeholder: 'mail.yourdomain.com' },
              { label: 'SMTP Port',            key: 'smtpPort',      placeholder: '587', type: 'number' },
              { label: 'SMTP Username',        key: 'smtpUser',      placeholder: 'noreply@yourdomain.com' },
              { label: 'From Name',            key: 'smtpFromName',  placeholder: 'Kore Kollective' },
              { label: 'From Email',           key: 'smtpFromEmail', placeholder: 'noreply@yourdomain.com' },
            ].map(f => (
              <div key={f.key}>
                <FieldLabel>{f.label}</FieldLabel>
                <input type={f.type || 'text'} value={(cfg as any)[f.key] || ''} placeholder={f.placeholder}
                  onChange={e => setField(f.key as keyof Config, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
              </div>
            ))}
            <div>
              <FieldLabel>SMTP Password</FieldLabel>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={cfg.smtpPass || ''} placeholder="••••••••"
                  onChange={e => setField('smtpPass', e.target.value)}
                  className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={cfg.smtpSecure} onChange={e => setField('smtpSecure', e.target.checked)} className="rounded border-slate-300 text-indigo-600" />
            <span className="text-xs font-bold text-slate-600">Use SSL/TLS (port 465)</span>
          </label>

          <div className="pt-2 border-t border-slate-100">
            <button onClick={testEmail} disabled={testing || !cfg.emailEnabled}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 disabled:opacity-40 transition-all">
              {testing ? <Loader2 size={13} className="animate-spin" /> : <TestTube2 size={13} />} Send Test Email
            </button>
          </div>
        </div>
      )}

      {/* ── WHATSAPP TAB ── */}
      {tab === 'whatsapp' && (
        <div className="space-y-4">
          {/* API Config */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><MessageCircle size={15} className="text-emerald-500" /> WhatsApp Cloud API</p>
              <Toggle value={cfg.waEnabled} onChange={v => setField('waEnabled', v)} color="emerald" label={cfg.waEnabled ? 'Enabled' : 'Disabled'} />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-medium text-amber-700 leading-relaxed">
              <strong>Setup:</strong> Meta Business → WhatsApp → API Setup se <strong>Permanent Token</strong> aur <strong>Phone Number ID</strong> lo. Templates pehle Meta se approve karao, phir template naam neeche daalo.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FieldLabel>Access Token (Permanent)</FieldLabel>
                <div className="relative">
                  <input type={showToken ? 'text' : 'password'} value={cfg.waToken || ''} placeholder="EAAxxxxx..."
                    onChange={e => setField('waToken', e.target.value)}
                    className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
                  <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>Phone Number ID</FieldLabel>
                <input value={cfg.waPhoneNumberId || ''} placeholder="123456789012345"
                  onChange={e => setField('waPhoneNumberId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
              </div>
              <div>
                <FieldLabel>Business Account ID <span className="font-normal text-slate-300">(optional)</span></FieldLabel>
                <input value={cfg.waBusinessAccountId || ''} placeholder="optional"
                  onChange={e => setField('waBusinessAccountId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <FieldLabel>Test Phone (+91...)</FieldLabel>
                <input type="tel" value={testWaPhone} onChange={e => setTestWaPhone(e.target.value)} placeholder="919876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
              </div>
              <button onClick={testWa} disabled={testing || !cfg.waEnabled || !testWaPhone}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 disabled:opacity-40 transition-all">
                {testing ? <Loader2 size={13} className="animate-spin" /> : <TestTube2 size={13} />} Test
              </button>
            </div>
          </div>

          {/* Message Templates Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MessageCircle size={14} className="text-emerald-500" /> Message Templates
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Meta se approve hue template names daalo. Language code: <code className="bg-slate-100 px-1 rounded">en</code>, <code className="bg-slate-100 px-1 rounded">en_US</code>, <code className="bg-slate-100 px-1 rounded">hi</code>
              </p>
            </div>

            {groups.map(g => (
              <div key={g.group}>
                <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className={GROUP_META[g.group]?.color || 'text-slate-500'}>{GROUP_META[g.group]?.icon}</span>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{g.group}</p>
                </div>
                {g.events.map(ev => {
                  const rule = ruleFor(ev.event);
                  return (
                    <div key={ev.event} className="grid grid-cols-[1fr_180px_90px] gap-3 items-center px-6 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{ev.label}</p>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">{ev.event}</p>
                      </div>
                      <input
                        value={rule?.waTemplate || ''}
                        onChange={e => setRule(ev.event, { waTemplate: e.target.value })}
                        placeholder={ev.waTemplate}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                      />
                      <input
                        value={rule?.waLanguage || 'en'}
                        onChange={e => setRule(ev.event, { waLanguage: e.target.value })}
                        placeholder="en"
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RULES TAB ── */}
      {tab === 'rules' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium">Har event ke liye decide karo — kaunse roles ko email/WA jayega aur distributor ko bhi bhejana hai ya nahi.</p>

          {groups.map(g => {
            const gOpen = expandedGroups[g.group] !== false; // default open
            const groupMeta = GROUP_META[g.group];
            const activeCount = g.events.filter(ev => { const r = ruleFor(ev.event); return r && (r.emailEnabled || r.waEnabled); }).length;

            return (
              <div key={g.group} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Group Header */}
                <button onClick={() => setExpandedGroups(p => ({ ...p, [g.group]: !gOpen }))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={groupMeta?.color || 'text-slate-500'}>{groupMeta?.icon}</span>
                    <span className="text-sm font-bold text-slate-800">{g.group}</span>
                    {activeCount > 0 && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider">{activeCount} active</span>
                    )}
                  </div>
                  {gOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>

                {gOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {g.events.map(ev => {
                      const rule = ruleFor(ev.event);
                      if (!rule) return null;
                      const eOpen = expandedEvents[ev.event];
                      const active = rule.emailEnabled || rule.waEnabled;

                      return (
                        <div key={ev.event}>
                          <button onClick={() => setExpandedEvents(p => ({ ...p, [ev.event]: !eOpen }))}
                            className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-700">{ev.label}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {rule.emailEnabled && <span className="flex items-center gap-1 text-[9px] text-indigo-500 font-bold"><Mail size={9} /> Email → {rule.emailRoles.join(', ')}{rule.emailDistributor ? ' + Dist.' : ''}</span>}
                                  {rule.waEnabled && <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold"><MessageCircle size={9} /> WA: <code className="font-mono">{rule.waTemplate || '—'}</code></span>}
                                  {!active && <span className="text-[9px] text-slate-300 font-medium">Off</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {rule.emailEnabled && <Mail size={11} className="text-indigo-400" />}
                              {rule.waEnabled && <MessageCircle size={11} className="text-emerald-400" />}
                              {eOpen ? <ChevronUp size={13} className="text-slate-300" /> : <ChevronDown size={13} className="text-slate-300" />}
                            </div>
                          </button>

                          {eOpen && (
                            <div className="px-5 pb-4 pt-1 bg-slate-50/40 space-y-4 border-t border-slate-100 animate-in fade-in duration-150">
                              {/* EMAIL */}
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <SmallToggle value={rule.emailEnabled} onChange={v => setRule(ev.event, { emailEnabled: v })} color="indigo" />
                                  <Mail size={11} className={rule.emailEnabled ? 'text-indigo-500' : 'text-slate-300'} />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email</span>
                                </div>
                                {rule.emailEnabled && (
                                  <div className="ml-7 flex flex-wrap gap-1.5">
                                    {ALL_ROLES.map(r => (
                                      <RoleChip key={r} label={ROLE_LABELS[r]} active={rule.emailRoles.includes(r)} onClick={() => toggleRole(ev.event, 'emailRoles', r)} color="indigo" />
                                    ))}
                                    <RoleChip label="+ Distributor" active={rule.emailDistributor} onClick={() => setRule(ev.event, { emailDistributor: !rule.emailDistributor })} color="emerald" />
                                  </div>
                                )}
                              </div>

                              {/* WHATSAPP */}
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <SmallToggle value={rule.waEnabled} onChange={v => setRule(ev.event, { waEnabled: v })} color="emerald" />
                                  <MessageCircle size={11} className={rule.waEnabled ? 'text-emerald-500' : 'text-slate-300'} />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">WhatsApp</span>
                                </div>
                                {rule.waEnabled && (
                                  <div className="ml-7 space-y-2.5">
                                    <div className="flex flex-wrap gap-1.5">
                                      {ALL_ROLES.map(r => (
                                        <RoleChip key={r} label={ROLE_LABELS[r]} active={rule.waRoles.includes(r)} onClick={() => toggleRole(ev.event, 'waRoles', r)} color="emerald" />
                                      ))}
                                      <RoleChip label="+ Distributor" active={rule.waDistributor} onClick={() => setRule(ev.event, { waDistributor: !rule.waDistributor })} color="emerald" />
                                    </div>
                                    <div className="flex gap-2">
                                      <div className="flex-1">
                                        <FieldLabel>Template Name</FieldLabel>
                                        <input value={rule.waTemplate} onChange={e => setRule(ev.event, { waTemplate: e.target.value })}
                                          placeholder="e.g. order_dispatched"
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
                                      </div>
                                      <div className="w-20">
                                        <FieldLabel>Language</FieldLabel>
                                        <input value={rule.waLanguage} onChange={e => setRule(ev.event, { waLanguage: e.target.value })}
                                          placeholder="en"
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400" />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{children}</label>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; color: 'indigo' | 'emerald'; label: string }> = ({ value, onChange, color, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors relative ${value ? (color === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-500') : 'bg-slate-200'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
    <span className="text-xs font-bold text-slate-600">{label}</span>
  </label>
);

const SmallToggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; color: 'indigo' | 'emerald' }> = ({ value, onChange, color }) => (
  <div onClick={() => onChange(!value)} className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer shrink-0 ${value ? (color === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-500') : 'bg-slate-200'}`}>
    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </div>
);

const RoleChip: React.FC<{ label: string; active: boolean; onClick: () => void; color: 'indigo' | 'emerald' }> = ({ label, active, onClick, color }) => (
  <button type="button" onClick={onClick}
    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
      active
        ? color === 'indigo' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
    }`}>
    {active && <Check size={9} />} {label}
  </button>
);

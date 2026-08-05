"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Home, MapPin, Plus, Save, Trash2, UserRound } from "lucide-react";

type Address = {
  id: string; label: string; recipient: string; phone: string; line1: string; line2?: string | null; landmark?: string | null; city: string; state: string; pincode: string; isDefault: boolean;
};
type Profile = { id: string; name: string; email?: string | null; phone?: string | null; addresses: Address[] };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Request failed.");
  return body.data as T;
}

export function ProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showAddress, setShowAddress] = useState(false);

  const load = useCallback(async () => {
    try { setProfile(await request<Profile>("/api/customer/profile")); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Profile unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await request("/api/customer/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      setMessage("Profile saved successfully."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Profile could not be saved."); }
    finally { setSaving(false); }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const data = { ...Object.fromEntries(form), isDefault: form.get("isDefault") === "on" };
    try {
      await request("/api/customer/addresses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      setShowAddress(false); setMessage("Address saved successfully."); await load(); event.currentTarget.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Address could not be saved."); }
    finally { setSaving(false); }
  }

  async function removeAddress(id: string) {
    if (!window.confirm("Remove this saved address?")) return;
    try { await request(`/api/customer/addresses?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setMessage("Address removed."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Address could not be removed."); }
  }

  if (loading) return <div className="surface-card page-loading">Loading profile…</div>;
  if (!profile) return <div className="surface-card form-error">{message || "Profile unavailable."}</div>;

  return <div className="profile-layout">
    <section className="surface-card"><div className="card-heading"><UserRound /><div><span>PERSONAL DETAILS</span><h2>Your profile</h2></div></div>
      <form className="resource-form" onSubmit={saveProfile}>
        <label>Full name<input name="name" defaultValue={profile.name} minLength={2} maxLength={80} required /></label>
        <div className="form-grid"><label>Mobile number<input name="phone" type="tel" defaultValue={profile.phone ?? ""} pattern="[6-9][0-9]{9}" maxLength={10} required /></label><label>Email address<input name="email" type="email" defaultValue={profile.email ?? ""} /></label></div>
        <button type="submit" disabled={saving}><Save /> {saving ? "Saving…" : "Save profile"}</button>
      </form>
    </section>
    <section className="surface-card"><div className="card-heading addresses-heading"><MapPin /><div><span>SAVED LOCATIONS</span><h2>Delivery addresses</h2></div><button type="button" onClick={() => setShowAddress((value) => !value)}><Plus /> Add address</button></div>
      {message && <div className={message.includes("success") || message.includes("saved") || message.includes("removed") ? "form-success" : "form-error"}>{message}</div>}
      <div className="address-list">{profile.addresses.length ? profile.addresses.map((address) => <article key={address.id}><span className="address-icon"><Home /></span><div><h3>{address.label} {address.isDefault && <b>Default</b>}</h3><p>{address.recipient}, {address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.landmark ? `${address.landmark}, ` : ""}{address.city}, {address.state} — {address.pincode}</p><small>{address.phone}</small></div><button type="button" aria-label={`Delete ${address.label}`} onClick={() => void removeAddress(address.id)}><Trash2 /></button></article>) : <div className="mini-empty"><MapPin /><p>No saved address yet.</p></div>}</div>
      {showAddress && <form className="resource-form address-form" onSubmit={saveAddress}>
        <div className="form-grid"><label>Label<input name="label" placeholder="Home, Work…" required /></label><label>Recipient<input name="recipient" required /></label></div>
        <div className="form-grid"><label>Phone<input name="phone" type="tel" pattern="[6-9][0-9]{9}" maxLength={10} required /></label><label>Pincode<input name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label></div>
        <label>Address line 1<input name="line1" minLength={5} placeholder="House, road and area" required /></label>
        <div className="form-grid"><label>Address line 2<input name="line2" /></label><label>Landmark<input name="landmark" /></label></div>
        <div className="form-grid"><label>City<input name="city" required /></label><label>State<input name="state" defaultValue="Assam" required /></label></div>
        <label className="checkbox-field"><input name="isDefault" type="checkbox" /> Make this my default address</label>
        <button type="submit" disabled={saving}><Save /> {saving ? "Saving…" : "Save address"}</button>
      </form>}
    </section>
  </div>;
}

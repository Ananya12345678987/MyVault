import { useState } from "react";
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from "lucide-react";
import * as api from "../lib/api";
import UnlockVault from "../pages/UnlockVault";

function BlankRow({ onSaved }) {
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [sensitive, setSensitive] = useState(true); // protected by default for new passwords
  const [showPassword, setShowPassword] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [error, setError] = useState("");

  async function saveOrUpdate() {
    if (!website.trim() && !savedId) return; // nothing to save yet
    setError("");
    try {
      if (savedId) {
        const result = await api.updateVaultItem(savedId, { website, username, password, notes, sensitive });
        onSaved(result.item, savedId);
      } else {
        const result = await api.createVaultItem({
          type: "password", title: website || "Untitled", website, username, password, notes, sensitive, tags: [],
        });
        setSavedId(result.item.id || result.item._id);
        onSaved(result.item, null);
      }
    } catch (err) {
      if (err.status === 423) setNeedsUnlock(true);
      else setError(err.message);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2 border-b border-border">
      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        onBlur={saveOrUpdate}
        placeholder="Key (e.g. reddit.com)"
        className="bg-transparent text-sm outline-none border-b border-dashed border-border focus:border-vault-green px-1 py-1"
      />
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onBlur={saveOrUpdate}
        placeholder="Username"
        className="bg-transparent text-sm outline-none border-b border-dashed border-border focus:border-vault-green px-1 py-1"
      />
      <input
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={saveOrUpdate}
        placeholder="Value"
        className="bg-transparent text-sm font-mono outline-none border-b border-dashed border-border focus:border-vault-green px-1 py-1"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveOrUpdate}
        placeholder="Add info"
        className="bg-transparent text-sm outline-none border-b border-dashed border-border focus:border-vault-green px-1 py-1"
      />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-text-muted hover:text-text">
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button
          type="button"
          onClick={() => { setSensitive((v) => !v); saveOrUpdate(); }}
          className={sensitive ? "text-amber" : "text-text-muted"}
          title={sensitive ? "Protected — click to make visible without unlocking" : "Open — click to protect"}
        >
          {sensitive ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
      </div>
      {needsUnlock && (
        <UnlockVault onUnlocked={() => { setNeedsUnlock(false); saveOrUpdate(); }} onCancel={() => setNeedsUnlock(false)} />
      )}
      {error && <p className="col-span-5 text-danger text-xs">{error}</p>}
    </div>
  );
}

function ExistingRow({ item, onUpdated, onDeleted }) {
  const [website, setWebsite] = useState(item.website || "");
  const [username, setUsername] = useState(item.username || "");
  const [password, setPassword] = useState(item.password || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [sensitive, setSensitive] = useState(item.sensitive);
  const [showPassword, setShowPassword] = useState(false);
  const [revealed, setRevealed] = useState(!item.sensitive);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    try {
      const result = await api.updateVaultItem(item._id, { website, username, password, notes, sensitive });
      onUpdated(result.item);
    } catch (err) {
      if (err.status === 423) setNeedsUnlock(true);
      else setError(err.message);
    }
  }

  async function handleRevealClick() {
    if (revealed) {
      setShowPassword((v) => !v);
      return;
    }
    try {
      const result = await api.getVaultItem(item._id);
      setPassword(result.item.value || "");
      setRevealed(true);
      setShowPassword(true);
    } catch (err) {
      if (err.status === 423) setNeedsUnlock(true);
      else setError(err.message);
    }
  }

  async function handleUnlocked() {
    setNeedsUnlock(false);
    await handleRevealClick();
  }

  async function handleDelete() {
    try {
      await api.deleteVaultItem(item._id);
      onDeleted(item._id);
    } catch (err) {
      if (err.status === 423) setNeedsUnlock(true);
      else setError(err.message);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2 border-b border-border hover:bg-surface-alt">
      <input value={website} onChange={(e) => setWebsite(e.target.value)} onBlur={save} className="bg-transparent text-sm outline-none px-1 py-1" />
      <input value={username} onChange={(e) => setUsername(e.target.value)} onBlur={save} className="bg-transparent text-sm outline-none px-1 py-1" />
      <input
        type={revealed && showPassword ? "text" : "password"}
        value={revealed ? password : "••••••••"}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={save}
        readOnly={!revealed}
        className="bg-transparent text-sm font-mono outline-none px-1 py-1"
      />
      <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={save} className="bg-transparent text-sm outline-none px-1 py-1" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleRevealClick} className="text-text-muted hover:text-text">
          {revealed && showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button
          type="button"
          onClick={() => { setSensitive((v) => !v); save(); }}
          className={sensitive ? "text-amber" : "text-text-muted"}
        >
          {sensitive ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
        <button type="button" onClick={handleDelete} className="text-text-muted hover:text-danger">
          <Trash2 size={15} />
        </button>
      </div>
      {needsUnlock && (
        <UnlockVault onUnlocked={handleUnlocked} onCancel={() => setNeedsUnlock(false)} />
      )}
      {error && <p className="col-span-5 text-danger text-xs">{error}</p>}
    </div>
  );
}

export default function PasswordTable({ items, onItemsChanged }) {
  const [blankRows, setBlankRows] = useState([0]); // keys for blank-row instances

  return (
    <div className="mt-6 border border-border rounded-sm overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-surface-alt text-xs font-mono uppercase tracking-wide text-text-muted">
        <span>Key</span>
        <span>Username</span>
        <span>Value</span>
        <span>Add info</span>
        <span></span>
      </div>

      {items.map((item) => (
        <ExistingRow
          key={item._id}
          item={item}
          onUpdated={() => onItemsChanged()}
          onDeleted={() => onItemsChanged()}
        />
      ))}

      {blankRows.map((key) => (
        <BlankRow key={key} onSaved={() => onItemsChanged()} />
      ))}

      <button
        type="button"
        onClick={() => setBlankRows((rows) => [...rows, Date.now()])}
        className="flex items-center gap-2 px-3 py-2.5 text-sm text-vault-green hover:bg-surface-alt w-full"
      >
        <Plus size={16} />
        Add
      </button>
    </div>
  );
}
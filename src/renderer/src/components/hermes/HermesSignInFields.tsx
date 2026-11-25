export type HermesSignInMode = 'api-key' | 'dashboard'
export type HermesLoginFields = { username: string; password: string; profile: string }
export const blankHermesLogin: HermesLoginFields = { username: '', password: '', profile: '' }

const fieldClass = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-[12.5px] text-ink outline-none focus:border-accent-600'

export function HermesSignInMethod({ mode, disabled, onChange }: {
  mode: HermesSignInMode
  disabled?: boolean
  onChange: (mode: HermesSignInMode) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-ink-secondary">连接方式</span>
      <select className={fieldClass} value={mode} disabled={disabled}
        onChange={e => onChange(e.target.value === 'dashboard' ? 'dashboard' : 'api-key')}>
        <option value="api-key">API Key（Hermes API Server）</option>
        <option value="dashboard">账号密码（Hermes Dashboard）</option>
      </select>
    </label>
  )
}

export function HermesDashboardLoginFields({ value, disabled, onChange }: {
  value: HermesLoginFields
  disabled?: boolean
  onChange: (value: HermesLoginFields) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-ink-secondary">Hermes 用户名</span>
        <input className={fieldClass} value={value.username} autoComplete="username" spellCheck={false}
          maxLength={1024} required onChange={e => onChange({ ...value, username: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-ink-secondary">Hermes 密码</span>
        <input className={fieldClass} type="password" value={value.password} autoComplete="current-password"
          maxLength={4096} required onChange={e => onChange({ ...value, password: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-ink-secondary">Profile（可选）</span>
        <input className={fieldClass} value={value.profile} maxLength={64} spellCheck={false}
          placeholder="留空使用默认 Profile" onChange={e => onChange({ ...value, profile: e.target.value })} />
      </label>
      <p className="text-[11.5px] text-ink-secondary">填写 Hermes Dashboard 网页地址。远程连接需要 HTTPS；密码不会保存。</p>
    </fieldset>
  )
}

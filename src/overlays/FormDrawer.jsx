import React from 'react'
import { css } from '../lib/css.js'

export default function FormDrawer({ v }) {
  return (
    <>
      <div onClick={v.closeFormX} style={css('position:fixed;inset:0;background:rgba(4,6,10,.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:130')}></div>
      <aside style={css('position:fixed;top:12px;right:12px;bottom:12px;width:560px;max-width:94vw;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 28px 70px rgba(0,0,0,.6);z-index:135;display:flex;flex-direction:column;overflow:hidden')}>
        <div style={css('padding:14px 16px;border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:9px;flex-shrink:0')}>
          <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:700')}>{v.formTitle}</div><div style={css('font-size:11.5px;color:var(--faint)')}>{v.formSub}</div></div>
          <button onClick={v.closeFormX} style={css('display:inline-flex;align-items:center;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:6px 11px;font-size:12px;font-weight:600;color:var(--text);cursor:pointer')}>Cancel</button>
          <button onClick={v.submitForm} style={css('display:inline-flex;align-items:center;gap:5px;background:var(--blue);color:#fff;border:0;border-radius:6px;padding:6px 13px;font-size:12px;font-weight:700;cursor:pointer')}>{v.formPrimary}</button>
        </div>
        <div style={css('flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:13px')}>
          <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Project</label><select style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none')}>{v.formProjects.map((p, i) => (<option key={p.id}>{p.name}</option>))}</select></div>

          {v.formIsCO && (
            <>
              <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Title</label><input placeholder="e.g. Add stairwell repaint" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none')}/></div>
              <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Description</label><textarea placeholder="Describe the change…" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;min-height:64px;resize:vertical;font-family:var(--font-ui)')} /></div>
              <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Amount</label><input placeholder="0" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;font-family:var(--font-mono)')}/></div>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Cost impact</label><input placeholder="0" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;font-family:var(--font-mono)')}/></div>
              </div>
              <div style={css('background:var(--panel-2);border:1px solid var(--line-soft);border-radius:9px;padding:12px;display:flex;justify-content:space-between;align-items:center')}>
                <div><div style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;font-weight:700')}>Profit impact</div><div style={css('font-size:21px;font-weight:800;font-family:var(--font-mono);color:var(--green)')}>$—</div></div>
                <div style={css('text-align:right')}><div style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;font-weight:700')}>New margin</div><div style={css('font-size:14px;font-weight:700;font-family:var(--font-mono)')}>—</div></div>
              </div>
            </>
          )}

          {v.formIsExpense && (
            <>
              <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Title</label><input placeholder="e.g. Paint & supplies" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none')}/></div>
              <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Category</label><select style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none')}><option>Materials</option><option>Labor</option><option>Equipment</option><option>Subcontractor</option><option>Travel</option><option>Other</option></select></div>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Vendor</label><input placeholder="Vendor" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none')}/></div>
              </div>
              <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px')}>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Amount</label><input placeholder="0.00" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;font-family:var(--font-mono)')}/></div>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Date</label><input placeholder="YYYY-MM-DD" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;font-family:var(--font-mono)')}/></div>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Status</label><select style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none')}><option>Unpaid</option><option>Paid</option></select></div>
              </div>
              <div style={css('border:1.5px dashed var(--line-strong);border-radius:9px;padding:16px;text-align:center;color:var(--faint);font-size:12px')}>Drop receipt photo or PDF here — auto-filed to Google Drive</div>
            </>
          )}

          {v.formIsBulk && (
            <>
              <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Date</label><input placeholder="YYYY-MM-DD" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;font-family:var(--font-mono)')}/></div>
                <div style={css('display:flex;flex-direction:column')}><label style={css('font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:5px')}>Same hours for all (reg)</label><input defaultValue="8" style={css('background:var(--input-bg);border:1px solid var(--line);border-radius:7px;padding:8px 9px;font-size:13px;color:var(--text);width:100%;outline:none;font-family:var(--font-mono)')}/></div>
              </div>
              <div style={css('font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)')}>Employees</div>
              <div style={css('border:1px solid var(--line);border-radius:8px;overflow:hidden')}>
                {v.formPainters.map((p, i) => (
                  <div key={p.id} style={css('display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line-soft)')}>
                    {p.defaultSel && (<span style={css('width:16px;height:16px;border-radius:4px;background:var(--blue);display:grid;place-items:center;color:#fff;font-size:11px;flex-shrink:0')}>✓</span>)}
                    <div style={p.avatarStyle}>{p.initials}</div>
                    <span style={css('flex:1;font-weight:600')}>{p.name}</span>
                    <span style={css('font-size:11px;color:var(--faint)')}>{p.crew}</span>
                    <input defaultValue="8" style={css('width:54px;text-align:right;background:var(--input-bg);border:1px solid var(--line);border-radius:6px;padding:5px 7px;font-size:12px;color:var(--text);outline:none;font-family:var(--font-mono)')}/>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

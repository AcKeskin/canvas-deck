import { useState } from "react";
import { createRoot } from "react-dom/client";

// In-page stand-ins for Obsidian's modals, so the harness needs no window.prompt or window.confirm.
const root = createRoot(document.getElementById("dialog")!);

function show<T>(render: (done: (v: T) => void) => React.ReactNode): Promise<T> {
	return new Promise((resolve) =>
		root.render(
			<div className="harness-dialog" role="dialog">
				{render((v) => {
					root.render(null);
					resolve(v);
				})}
			</div>,
		),
	);
}

function TextForm({ label, value, done }: { label: string; value: string; done: (v: string | null) => void }) {
	const [text, setText] = useState(value);
	return (
		<form onSubmit={(e) => (e.preventDefault(), done(text))}>
			<label>
				{label} <input autoFocus value={text} onChange={(e) => setText(e.target.value)} />
			</label>
			<button type="submit">OK</button>
			<button type="button" onClick={() => done(null)}>Cancel</button>
		</form>
	);
}

export const askText = (label: string, value = "") => show<string | null>((done) => <TextForm label={label} value={value} done={done} />);

export const askYesNo = (message: string) =>
	show<boolean>((done) => (
		<>
			<p>{message}</p>
			<button onClick={() => done(false)}>Cancel</button>
			<button onClick={() => done(true)}>Delete</button>
		</>
	));

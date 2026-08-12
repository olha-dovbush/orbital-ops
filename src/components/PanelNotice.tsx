// The loading and error chrome every panel shares. Each panel gates on its own
// query and renders this instead of the section body, so one slow or dead feed
// only ever replaces its own section of the board.
//
// Named away from "state"/"status" on purpose: CONTEXT.md reserves Station
// Status for NOMINAL | DEGRADED | CRITICAL, and this is a query lifecycle.

type PanelNoticeProps = { title: string } & (
  | { kind: 'loading'; message: string }
  | { kind: 'error'; message: string; onRetry: () => void }
);

export default function PanelNotice(props: PanelNoticeProps) {
  return (
    <section className="panel">
      <h2>{props.title}</h2>
      {props.kind === 'error' ? (
        <div className="panel-error">
          <p>⚠ {props.message}</p>
          <button onClick={props.onRetry}>Retry</button>
        </div>
      ) : (
        <div className="panel-loading">
          <div className="spinner" />
          <p>{props.message}</p>
        </div>
      )}
    </section>
  );
}

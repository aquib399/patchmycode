interface TimeComponents {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

export function calculateMs(props: TimeComponents = {}): number {
  const {
    years = 0,
    months = 0,
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0
  } = props;
  const s = 1000;
  const m = s * 60;
  const h = m * 60;
  const d = h * 24;

  const y = d * 365.25;
  const mo = y / 12;

  return (
    years * y +
    months * mo +
    days * d +
    hours * h +
    minutes * m +
    seconds * s +
    milliseconds
  );
}

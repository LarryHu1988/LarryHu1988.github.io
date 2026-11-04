export function captureLabel(capture) {
  if (!capture) return '';
  let date = '';
  if (typeof capture.takenAt === 'string') {
    const [day, time] = capture.takenAt.split('T');
    date = day.replaceAll('-', '.') + (time ? ' ' + time.slice(0, 5) : '');
  }
  const make = typeof capture.make === 'string' ? capture.make.trim() : '';
  const model = typeof capture.model === 'string' ? capture.model.trim() : '';
  const modelIncludesMake = make && model.toLowerCase().includes(make.toLowerCase());
  const appleDevice = /^apple$/i.test(make) && /^i(?:Phone|Pad|Pod)\b/.test(model);
  const device = modelIncludesMake || appleDevice ? model : [make, model].filter(Boolean).join(' ');
  return [date, device].filter(Boolean).join(' · ');
}

export function secretValues(env: Record<string, unknown>) {
  return Object.entries(env)
    .filter(
      ([key, value]) =>
        /(key|token|secret|password|credential)/i.test(key) &&
        typeof value === "string" &&
        value.length >= 4
    )
    .map(([, value]) => value as string);
}
export function secretLogFilter(initial: string[] = []) {
  let values = Array.from(new Set(initial.filter(Boolean))).sort(
    (a, b) => b.length - a.length
  );
  const buffers = { stdout: "", stderr: "" };
  const text = (value: string) =>
    values.reduce((s, secret) => s.split(secret).join("[REDACTED]"), value);
  function clean<T>(value: T): T {
    if (typeof value === "string") return text(value) as T;
    if (Array.isArray(value)) return value.map(clean) as T;
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, clean(v)])
      ) as T;
    return value;
  }
  return {
    text,
    clean,
    add(items: string[]) {
      values = Array.from(new Set([...values, ...items.filter(Boolean)])).sort(
        (a, b) => b.length - a.length
      );
    },
    write(stream: "stdout" | "stderr", chunk: string, end = false) {
      const raw = buffers[stream] + chunk;
      if (!values.length) {
        buffers[stream] = "";
        return raw;
      }
      const length = values[0].length;
      let i = 0;
      let output = "";
      while (i < raw.length) {
        const match = values.find((value) => raw.startsWith(value, i));
        if (match) {
          output += "[REDACTED]";
          i += match.length;
        } else if (!end && raw.length - i < length) break;
        else output += raw[i++];
      }
      buffers[stream] = raw.slice(i);
      return output;
    },
  };
}

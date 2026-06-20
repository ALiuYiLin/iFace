import clsx from 'clsx';

export function useNameSpace(styles: Record<string, string>) {
  return (...args: any[]) => {
    return clsx(
      args.map(arg => {
        if (typeof arg === 'string') return styles[arg] ?? arg;
        if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
          return Object.fromEntries(
            Object.entries(arg).map(([k, v]) => [styles[k] ?? k, v]),
          );
        }
        return arg;
      }),
    );
  };
}

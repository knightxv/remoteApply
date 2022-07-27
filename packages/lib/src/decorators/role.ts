export const role = <T extends { new (...args: any[]): {} }>(name: string) => {
  const f = function (ctor: T) {
    return class extends ctor {
      __db__ = [];
    };
  };
  return f as any;
};

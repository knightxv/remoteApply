export const field = (name: string) => {
  const f = function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {

  };
  return f as any;
};

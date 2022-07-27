// @fixme , 控制字符转义后有问题，比如 '\n' => '\u000b'
export const getMaxKey = (key: string) => {
  const splitArr = key.split('');
  const endChar = String.fromCharCode(key.charCodeAt(key.length - 1) + 1);
  splitArr[splitArr.length - 1] = endChar;
  const max = splitArr.join('');
  return max;
};

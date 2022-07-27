import test from 'ava';
import { SortedSet } from '@cccd/lib';


test('测试排序集合number', async (t) => {
  const set = new SortedSet(5, true);
  set.add('c', 3);
  set.add('d', 4);
  set.add('e', 5);
  set.add('a', 1);
  set.add('b', 2);
  set.add('f', 6);
  t.deepEqual(set.range(0, 6), ['f', 'e', 'd', 'c', 'b']);
  t.deepEqual(set.keys(), ['f', 'e', 'd', 'c', 'b']);
  t.deepEqual(set.values(), [6, 5, 4, 3, 2]);

  t.true(set.has('f'));
  t.false(set.has('g'));
  t.assert(set.get('f') === 6);
  t.assert(set.get('g') === null);
  t.assert(set.rank('f') === 0);
  t.assert(set.size() === 5);

  set.remove('f');
  t.false(set.has('f'));
  t.assert(set.rank('e') === 0);
  t.assert(set.size() === 4);

  t.deepEqual(set.range(2, 4), ['c', 'b']);
  t.deepEqual(set.rangeValue(2, 4), [3, 2]);
  t.deepEqual(set.rangeWithValue(2, 4), [{ key: 'c', value: 3 }, { key: 'b', value: 2 }]);
});

interface ItemData {
  score: number;
  data: {
    name: string,
    age: number,
  };
}

test('测试排序集合', async (t) => {
  const newItem = (score: number) => {
    return {
      score,
      data: {
        name: 'test',
        age: 18,
      }
    };
  }

  const set = new SortedSet<string, ItemData>(5, true);
  set.add('c', newItem(3));
  set.add('d', newItem(4));
  set.add('e', newItem(5));
  set.add('a', newItem(1));
  set.add('b', newItem(2));
  set.add('f', newItem(6));
  t.deepEqual(set.range(0, 6), ['f', 'e', 'd', 'c', 'b']);
  t.deepEqual(set.keys(), ['f', 'e', 'd', 'c', 'b']);
  t.deepEqual(set.values(), [newItem(6), newItem(5), newItem(4), newItem(3), newItem(2)]);

  t.true(set.has('f'));
  t.false(set.has('g'));
  t.deepEqual(set.get('f'), newItem(6));
  t.assert(set.get('g') === null);
  t.assert(set.rank('f') === 0);
  t.assert(set.size() === 5);

  set.remove('f');
  t.false(set.has('f'));
  t.assert(set.rank('e') === 0);
  t.assert(set.size() === 4);

  t.deepEqual(set.range(2, 4), ['c', 'b']);
  t.deepEqual(set.rangeValue(2, 4), [newItem(3), newItem(2)]);
  t.deepEqual(set.rangeWithValue(2, 4), [{ key: 'c', value: newItem(3) }, { key: 'b', value: newItem(2) }]);
});

test('测试排序集合bench', async (t) => {
  const num = 100000;
  const set = new SortedSet(num, true);
  let data: Array<[string, number]> = new Array(num);
  for (let i = 0; i < num; i++) {
    data[i] = [i.toString(), i];
  }

  // implement shuffle
  for (let i = 0; i < num; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = data[i];
    data[i] = data[j];
    data[j] = temp;
  }

  console.time('add');
  for (let i = 0; i < num; i++) {
    set.add(data[i][0], data[i][1]);
  }
  console.timeEnd('add');
  t.assert(set.size() === num);

  console.time('rank');
  for (let i = 0; i < num; i++) {
    set.rank(data[i][0]);
  }
  console.timeEnd('rank');
});
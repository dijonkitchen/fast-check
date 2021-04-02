import { LazyArbitrary, letrec } from '../../../../src/check/arbitrary/LetRecArbitrary';
import { Arbitrary } from '../../../../src/check/arbitrary/definition/Arbitrary';
import { Shrinkable } from '../../../../src/check/arbitrary/definition/Shrinkable';
import { Random } from '../../../../src/random/generator/Random';

import * as stubRng from '../../stubs/generators';
import { convertFromNext, convertToNext } from '../../../../src/check/arbitrary/definition/Converters';

describe('LetRecArbitrary', () => {
  describe('letrec', () => {
    it('Should be able to construct independant arbitraries', () => {
      const expectedArb1 = buildArbitrary(jest.fn());
      const expectedArb2 = buildArbitrary(jest.fn());

      const { arb1, arb2 } = letrec((_tie) => ({
        arb1: expectedArb1,
        arb2: expectedArb2,
      }));

      expect(arb1).toBe(expectedArb1);
      expect(arb2).toBe(expectedArb2);
    });
    it('Should not produce LazyArbitrary for no-tie constructs', () => {
      const { arb } = letrec((_tie) => ({
        arb: buildArbitrary(jest.fn()),
      }));
      expect(arb).not.toBeInstanceOf(LazyArbitrary);
    });
    it('Should not produce LazyArbitrary for indirect tie constructs', () => {
      const { arb } = letrec((tie) => ({
        // arb is an arbitrary wrapping the tie value (as fc.array)
        arb: buildArbitrary((mrng) => tie('arb').generate(mrng)),
      }));
      expect(arb).not.toBeInstanceOf(LazyArbitrary);
    });
    it('Should produce LazyArbitrary for direct tie constructs', () => {
      const { arb } = letrec((tie) => ({
        arb: tie('arb'),
      }));
      expect(convertToNext(arb)).toBeInstanceOf(LazyArbitrary);
    });
    it('Should be able to construct mutually recursive arbitraries', () => {
      const { arb1, arb2 } = letrec((tie) => ({
        arb1: tie('arb2'),
        arb2: tie('arb1'),
      }));
      expect(arb1).toBeDefined();
      expect(arb2).toBeDefined();
    });
    it('Should apply tie correctly', () => {
      const expectedArb = buildArbitrary(jest.fn());
      const { arb1: arb1Old, arb2: arb2Old, arb3: arb3Old } = letrec((tie) => ({
        arb1: tie('arb2'),
        arb2: tie('arb3'),
        arb3: expectedArb,
      }));
      const arb1 = convertToNext(arb1Old);
      const arb2 = convertToNext(arb2Old);
      const arb3 = convertToNext(arb3Old);

      expect(arb1).toBeInstanceOf(LazyArbitrary);
      expect(arb2).toBeInstanceOf(LazyArbitrary);
      expect(arb3).not.toBeInstanceOf(LazyArbitrary);

      expect((arb1 as any).underlying).toBe(arb2);
      expect(convertFromNext((arb2 as any).underlying)).toBe(arb3Old);
      expect(arb3Old).toBe(expectedArb);
    });
    it('Should be able to delay calls to tie', () => {
      const mrng = stubRng.mutable.nocall();
      const generateMock = jest.fn().mockReturnValueOnce(new Shrinkable(null));
      const simpleArb = buildArbitrary(generateMock);
      const { arb1 } = letrec((tie) => ({
        arb1: buildArbitrary((mrng) => tie('arb2').generate(mrng)),
        arb2: simpleArb,
      }));

      expect(generateMock).not.toHaveBeenCalled();
      arb1.generate(mrng);

      expect(generateMock).toHaveBeenCalled();
    });
    it('Should throw on generate if tie receives an invalid parameter', () => {
      const mrng = stubRng.mutable.nocall();
      const { arb1 } = letrec((tie) => ({
        arb1: tie('missing'),
      }));
      expect(() => arb1.generate(mrng)).toThrowErrorMatchingSnapshot();
    });
    it('Should throw on generate if tie receives an invalid parameter after creation', () => {
      const mrng = stubRng.mutable.nocall();
      const { arb1 } = letrec((tie) => ({
        arb1: buildArbitrary((mrng) => tie('missing').generate(mrng)),
      }));
      expect(() => arb1.generate(mrng)).toThrowErrorMatchingSnapshot();
    });
    it('Should apply tie correctly', () => {
      const expectedArb = buildArbitrary(jest.fn());
      const { arb1: arb1Old, arb2: arb2Old, arb3: arb3Old } = letrec((tie) => ({
        arb1: tie('arb2'),
        arb2: tie('arb3'),
        arb3: expectedArb,
      }));
      const arb1 = convertToNext(arb1Old);
      const arb2 = convertToNext(arb2Old);
      const arb3 = convertToNext(arb3Old);

      expect(arb1).toBeInstanceOf(LazyArbitrary);
      expect(arb2).toBeInstanceOf(LazyArbitrary);
      expect(arb3).not.toBeInstanceOf(LazyArbitrary);

      expect((arb1 as any).underlying).toBe(arb2);
      expect(convertFromNext((arb2 as any).underlying)).toBe(arb3Old);
      expect(arb3Old).toBe(expectedArb);
    });
    it('Should accept "reserved" keys', () => {
      const mrng = stubRng.mutable.nocall();
      const generateMock = jest.fn().mockReturnValueOnce(new Shrinkable(null));
      const simpleArb = buildArbitrary(generateMock);
      const { tie } = letrec((tie) => ({
        tie: tie('__proto__'),
        ['__proto__']: tie('__defineGetter__​​'),
        ['__defineGetter__​​']: tie('__defineSetter__​​'),
        ['__defineSetter__​​']: tie('__lookupGetter__​​'),
        ['__lookupGetter__​​']: tie('__lookupSetter__​​'),
        ['__lookupSetter__​​']: tie('constructor​​'),
        ['constructor​​']: tie('hasOwnProperty​​'),
        ['hasOwnProperty​​']: tie('isPrototypeOf​​'),
        ['isPrototypeOf​​']: tie('propertyIsEnumerable​​'),
        ['propertyIsEnumerable​​']: tie('toLocaleString​​'),
        ['toLocaleString​​']: tie('toSource​​'),
        ['toSource​​']: tie('toString​​'),
        ['toString​​']: tie('valueOf'),
        ['valueOf']: simpleArb,
      }));

      expect(generateMock).not.toHaveBeenCalled();
      tie.generate(mrng);

      expect(generateMock).toHaveBeenCalled();
    });
    it('Should accept builders producing objects based on Object.create(null)', () => {
      const mrng = stubRng.mutable.nocall();
      const generateMock = jest.fn().mockReturnValueOnce(new Shrinkable(null));
      const simpleArb = buildArbitrary(generateMock);
      const { a } = letrec((tie) =>
        Object.assign(Object.create(null), {
          a: tie('b'),
          b: simpleArb,
        })
      );

      expect(generateMock).not.toHaveBeenCalled();
      a.generate(mrng);

      expect(generateMock).toHaveBeenCalled();
    });
  });
  describe('LazyArbitrary', () => {
    it('Should fail to generate when no underlying arbitrary', () => {
      const mrng = stubRng.mutable.nocall();
      const lazy = new LazyArbitrary('id007');
      expect(() => lazy.generate(mrng, 2)).toThrowErrorMatchingSnapshot();
    });
  });
});

const buildArbitrary = (generate: (mrng: Random) => Shrinkable<any>, withBias?: (n: number) => Arbitrary<any>) => {
  return new (class extends Arbitrary<any> {
    generate(mrng: Random) {
      return generate(mrng);
    }
    withBias(n: number): Arbitrary<any> {
      return withBias ? withBias(n) : this;
    }
  })();
};

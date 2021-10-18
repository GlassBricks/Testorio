/** @noSelfInFile */

declare const test: Testorio.TestCreator
declare const it: Testorio.TestCreator
declare const describe: Testorio.DescribeCreator
declare const beforeAll: Testorio.Lifecycle
declare const afterAll: Testorio.Lifecycle
declare const beforeEach: Testorio.Lifecycle
declare const afterEach: Testorio.Lifecycle
declare const afterTest: Testorio.Lifecycle
declare function async(timeout?: number): void
declare function done(): void
declare function onTick(func: (tick: number) => void): void
declare function afterTicks(ticks: number, func: Testorio.TestFn): void
declare function ticksBetweenTests(ticks: number): void

/** @noSelfInFile */
declare namespace Testorio {
  type TestFn = () => void
  type HookFn = TestFn

  /** @noSelf */
  interface TestCreatorBase {
    (name: string, func: TestFn): TestBuilder

    each<V extends any[]>(
      values: V[],
      name: string,
      func: (...values: V) => void,
    ): TestBuilder<typeof func>
    each<T>(
      values: T[],
      name: string,
      func: (value: T) => void,
    ): TestBuilder<typeof func>
  }

  /** @noSelf */
  interface TestCreator extends TestCreatorBase {
    skip: TestCreatorBase
    only: TestCreatorBase
    todo(name: string): void
  }

  /** @noSelf */
  export interface TestBuilder<F extends (...args: any) => void = TestFn> {
    next(func: F): TestBuilder<F>
    after_ticks(ticks: number, func: F): TestBuilder<F>
    after_script_reload(func: F): TestBuilder<F>
    after_mod_reload(func: F): TestBuilder<F>
  }

  /** @noSelf */
  interface DescribeCreatorBase {
    (name: string, func: TestFn): void

    each<V extends any[]>(
      values: V[],
      name: string,
      func: (...values: V) => void,
    ): void
    each<T>(values: T[], name: string, func: (value: T) => void): void
  }

  /** @noSelf */
  interface DescribeCreator extends DescribeCreatorBase {
    skip: DescribeCreatorBase
    only: DescribeCreatorBase
  }

  type Lifecycle = (func: HookFn) => void
}

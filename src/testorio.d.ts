/* eslint-disable no-var */
import TestFn = Testorio.TestFn

declare var test: Testorio.TestCreator
declare var it: Testorio.TestCreator
declare var describe: Testorio.DescribeCreator
declare var before_all: Testorio.Lifecycle
declare var after_all: Testorio.Lifecycle
declare var before_each: Testorio.Lifecycle
declare var after_each: Testorio.Lifecycle
declare var after_test: Testorio.Lifecycle
declare function async(timeout?: number): void
declare function done(): void
declare function on_tick(func: Testorio.OnTickFn): void
declare function after_ticks(ticks: number, func: Testorio.TestFn): void
declare function ticks_between_tests(ticks: number): void
declare function part(func: TestFn): void

declare namespace Testorio {
  interface Config {
    show_progress_gui?: boolean

    default_timeout?: number
    default_ticks_between_tests?: number

    game_speed?: number

    verbose?: boolean

    before_test_run?(): void
    after_test_run?(): void
  }

  type TestFn = () => void
  type HookFn = TestFn
  type OnTickFn = (tick: number) => void | boolean

  /** @noSelf */
  interface TestCreatorBase {
    (name: string, func: TestFn): TestBuilder

    each<V extends any[]>(values: V[], name: string, func: (...values: V) => void): TestBuilder<typeof func>
    each<T>(values: T[], name: string, func: (value: T) => void): TestBuilder<typeof func>
  }

  /** @noSelf */
  interface TestCreator extends TestCreatorBase {
    skip: TestCreatorBase
    only: TestCreatorBase
    todo(name: string): void
  }

  /** @noSelf */
  export interface TestBuilder<F extends (...args: any) => void = TestFn> {
    after_script_reload(func: F): TestBuilder<F>
    after_mod_reload(func: F): TestBuilder<F>
  }

  /** @noSelf */
  interface DescribeCreatorBase {
    (name: string, func: TestFn): void

    each<V extends any[]>(values: V[], name: string, func: (...values: V) => void): void
    each<T>(values: T[], name: string, func: (value: T) => void): void
  }

  /** @noSelf */
  interface DescribeCreator extends DescribeCreatorBase {
    skip: DescribeCreatorBase
    only: DescribeCreatorBase
  }

  type Lifecycle = (func: HookFn) => void
}

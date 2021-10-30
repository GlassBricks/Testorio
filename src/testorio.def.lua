---@type TestCreator
test = nil
---@type TestCreator
it = nil
---@type DescribeCreator
describe = nil
---@type Lifecycle
beforeAll = nil
---@type Lifecycle
afterAll = nil
---@type Lifecycle
beforeEach = nil
---@type Lifecycle
afterEach = nil
---@type Lifecycle
afterTest = nil

---@param timeout number|nil
---@overload fun()
function async(timeout) end

function done() end

---@param func OnTickFn
function onTick(func) end

---@param ticks number
---@param func TestFn
function afterTicks(ticks, func) end

---@param ticks number
function ticksBetweenTests(ticks) end


---@alias TestFn fun(): void
---@alias HookFn TestFn
---@alias OnTickFn (fun(tick: number): void) | (fun(tick: number): boolean)

---@class TestCreatorBase
---@overload fun(name: string, func: TestFn): TestBuilder<TestFn>
local TestCreatorBase = {}
---@generic T
---@param values T[][]
---@param name string
---@param func fun(vararg T): void
---@return TestBuilder<fun(v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T): void>
---@overload fun<T>(values: T[], name: string, func: fun(v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T): void): TestBuilder<fun(v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T): void>
function TestCreatorBase.each(values, name, func) end

---@class TestCreator : TestCreatorBase
---@overload fun(name: string, func: TestFn): TestBuilder<TestFn>
---@field skip TestCreatorBase
---@field only TestCreatorBase
local TestCreator = {
    ---@param name string
    todo = function(name)
    end
}

---@class TestBuilder<T>
local TestBuilder = {}

---@param func T
---@return TestBuilder<T>
function TestBuilder.after_script_reload(func) end

---@param func T
---@return TestBuilder<T>
function TestBuilder.after_mod_reload(func) end

---@class DescribeCreatorBase
---@overload fun(name: string, func: TestFn): void
local DescribeCreatorBase = {}

---@generic T
---@param values T[][]
---@param name string
---@param func fun(v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T): void
---@overload fun<T>(values: T[], name: string, func: fun(v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T, v: T): void): void
function DescribeCreatorBase.each(values, name, func) end

---@class DescribeCreator : DescribeCreatorBase
---@overload fun(name: string, func: TestFn): void
---@field skip: DescribeCreator
---@field only: DescribeCreator

---@alias Lifecycle fun(func: HookFn): void

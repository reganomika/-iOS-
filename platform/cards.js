// АВТОГЕНЕРАЦИЯ — не редактировать руками. Источник: *.md (формат v4).
// Перегенерировать: node platform/parse.mjs
window.CARDS = [
  {
    "id": "Классы-и-структуры-q1",
    "q": 1,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Инициализаторы в структуре",
    "level": "easy",
    "promptType": "tell",
    "cue": "Расскажи про инициализацию структур: что даётся по умолчанию и что это отключает.",
    "core": "Нет своих init → компилятор даёт **memberwise** `init(...)` и `init()` (если у всех полей есть дефолты). Свои init тоже можно (несколько, `init?`, `throws`), но любой свой init **в теле** структуры отключает memberwise-синтез.",
    "why": "Пока не присвоены все stored-поля, к `self` обращаться нельзя (`let` — ровно один раз). Так гарантируется «нет частично собранного значения».",
    "trap": "Объявил свой init в теле — memberwise пропал. Хочешь оба → выноси свой init в `extension`.",
    "anchor": "Memberwise — как заводская гарантия: действует, пока ты сам не вскрыл корпус (не написал свой init в теле).",
    "phrase": "Memberwise по умолчанию, но свой init убивает синтез; чтобы сохранить оба — выношу init в extension.",
    "followup": {
      "q": "Нужен и свой `init`, и memberwise — как?",
      "a": "Свой init в `extension`, тело структуры остаётся «нетронутым»."
    },
    "deep": "**Memberwise** — параметры и доступность зависят от уровней доступа stored-полей (`private` → недоступен извне). **Default `init()`** — когда у всех полей есть дефолты/`nil`. Невозможное состояние → `init?` или `init throws`.\n\n```swift\nstruct User {\n    let id: String\n    var name: String = \"Anonymous\"\n\n    init(id: String, name: String? = nil) {   // свой init → memberwise пропал\n        self.id = id\n        self.name = name ?? \"Anonymous\"\n    }\n\n    init?(rawID: String) {                      // failable; name возьмёт дефолт\n        guard !rawID.isEmpty else { return nil }\n        self.id = rawID\n    }\n}\n```\n\n*Источник:* Swift Language Guide — Initialization.",
    "sources": "Swift Language Guide — Initialization."
  },
  {
    "id": "Классы-и-структуры-q2",
    "q": 2,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Copy-on-write (CoW)",
    "level": "easy",
    "promptType": "tell",
    "cue": "Расскажи, что знаешь о copy-on-write — и когда буфер реально копируется.",
    "core": "Копии value-типа делят один heap-буфер, пока его не мутируют; реальная копия буфера — при первой мутации **не-уникального** буфера (проверка `isKnownUniquelyReferenced`). Есть у `Array`, `Dictionary`, `Set`, `String`, `Data`.",
    "why": "Копировать дорого, а большинство копий только читают — затраты откладываются до момента, когда правда нужны.",
    "trap": "CoW ≠ thread-safe: две мутации одного значения из разных потоков = data race. Первая мутация после шаринга может быть дорогой.",
    "anchor": "Общий Google-Док: пока все читают — документ один на всех; как только кто-то печатает — ему втихаря делают личную копию.",
    "phrase": "Storage общий до первой мутации; тогда, если буфер не уникален, делается копия — value semantics сохранены.",
    "followup": {
      "q": "Передал массив в функцию, она только читает — копия буфера была?",
      "a": "Нет, пока нет мутации."
    },
    "deep": "Кастомный CoW строят вокруг reference-хранилища:\n\n```swift\nfinal class Storage {\n    var values: [Int]\n    init(_ v: [Int]) { values = v }\n    func copy() -> Storage { Storage(values) }\n}\n\nstruct CoWBox {\n    private var storage: Storage\n    init(_ v: [Int]) { storage = Storage(v) }\n\n    private mutating func ensureUnique() {\n        if !isKnownUniquelyReferenced(&storage) { storage = storage.copy() }\n    }\n    mutating func append(_ x: Int) { ensureUnique(); storage.values.append(x) }\n}\n```\n\nКопия бывает и по другим причинам (реаллокация при росте capacity). Layout `String`/`Array` зависит от версии Swift/ABI — объясняй принцип, не байты.\n\n*Источники:* Swift stdlib (Array/String), `isKnownUniquelyReferenced`, WWDC по value semantics.",
    "sources": "Swift stdlib (Array/String), `isKnownUniquelyReferenced`, WWDC по value semantics."
  },
  {
    "id": "Классы-и-структуры-q3",
    "q": 3,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Что быстрее: структура или класс?",
    "level": "medium",
    "promptType": "reason",
    "cue": "Что быстрее — структура или класс, и от чего это зависит?",
    "core": "Универсального ответа нет. Обычно `struct` быстрее (inline-хранение, cache locality, нет ARC, static dispatch); `class` платит за ARC + heap-аллокацию + indirection. Но большой часто копируемый value-тип может проигрывать классу.",
    "why": "struct лежит подряд и копируется как байты; class — это аллокация в heap + retain/release на каждое присваивание/передачу/захват.",
    "trap": "Сравнивать «struct vs class» без сценария бессмысленно — надо уточнить операцию (создание/копирование/доступ/коллекции).",
    "anchor": "Записку носишь в копиях; рояль не таскаешь — даёшь адрес, где он стоит. Маленькое → struct, большое и часто передаваемое → ссылка (class).",
    "phrase": "Уточню сценарий. Обычно struct быстрее из-за локальности и отсутствия ARC, но большой часто копируемый тип может проигрывать классу. Финал — мерить в Instruments.",
    "followup": {
      "q": "Когда class реально быстрее?",
      "a": "Когда value-тип большой и его часто копируют/возвращают между слоями."
    },
    "deep": "- **Локальность.** `Array<Struct>` хранит элементы подряд (меньше cache misses); `Array<Class>` — подряд только ссылки, объекты разбросаны по heap.\n- **Копии.** Маленькие структуры — дёшево; большие — дорого при частой передаче. CoW спасает только типы, которые его реализуют.\n- **ARC.** У класса retain/release; у struct ARC нет, но работает для reference-полей внутри.\n- **Dispatch.** Value-типы чаще допускают static dispatch + inlining + specialization; классы — virtual (vtable), хотя `final` + WMO дают девиртуализацию.\n\n*Источники:* WWDC по performance, Instruments (Time Profiler / Allocations).",
    "sources": "WWDC по performance, Instruments (Time Profiler / Allocations)."
  },
  {
    "id": "Классы-и-структуры-q4",
    "q": 4,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Почему размер структуры должен быть известен заранее?",
    "level": "medium",
    "promptType": "reason",
    "cue": "Почему компилятору нужен фиксированный размер структуры — и как тогда делать рекурсивные?",
    "core": "`struct` лежит **inline** (стек / внутри другого значения / в буфере массива), поэтому нужен фиксированный размер и layout — для аллокации, копирования и доступа к полям по offset (`base + offset`). Рекурсия — только через индирекцию (ссылка / `indirect`).",
    "why": "Кадр стека нарезается заранее; доступ к полю = `base + offset` — без известного размера это невозможно.",
    "trap": "Структура со stored-полем самого себя = бесконечный размер (не компилируется).",
    "anchor": "Полка на стеке нарезается заранее — габариты надо знать. Структура внутри себя = матрёшка без дна (∞); спасает «адрес склада» — ссылка на heap.",
    "phrase": "Value-тип лежит inline, поэтому размер должен быть определим. Рекурсию делаю через индирекцию: Box-ссылку или indirect enum.",
    "followup": {
      "q": "Как сделать связный список на value-типах?",
      "a": "Через ссылку (`Box<Node>?`) или `indirect enum`."
    },
    "deep": "```swift\nstruct Node { var next: Node }          // ❌ бесконечный размер\n\nfinal class Box<T> { var value: T; init(_ v: T) { value = v } }\nstruct Node2 { var next: Box<Node2>? }  // ✅ фиксированный размер (optional-ссылка)\n\nindirect enum List<T> { case end; case node(T, List<T>) }  // ✅ через indirect\n```\n\n`Array`/`String`/`Data` логически переменного размера, но само значение фиксированного размера и держит ссылки/счётчики на heap-буфер. Generic: `Foo<Int>` и `Foo<String>` — разные размеры, но каждый фиксирован после специализации.\n\n*Источники:* Swift Language Guide — Initialization, `indirect enum`.",
    "sources": "Swift Language Guide — Initialization, `indirect enum`."
  },
  {
    "id": "Классы-и-структуры-q5",
    "q": 5,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Когда лучше класс, а когда структура?",
    "level": "medium",
    "promptType": "compare",
    "cue": "Когда берёшь class, а когда struct?",
    "core": "Критерий — **семантика**, не скорость. Нужна независимая копия → `struct` (value semantics). Нужна identity / разделяемое изменяемое состояние → `class` (или `actor`).",
    "why": "struct = «значение» (две одинаковые копии неразличимы); class = «сущность» с identity (`===`), на которую все ссылаются и видят изменения.",
    "trap": "«struct = thread-safe» неверно (зависит от мутаций и reference-содержимого). А `class` «на всякий случай» → сайд-эффекты + retain cycles.",
    "anchor": "Деньги против человека: 10₽ = 10₽, копия неважна (struct). А «тот самый Иван» — один, на него все ссылаются (class).",
    "phrase": "Независимая копия — struct; общая идентичность и shared mutable state — class или actor.",
    "followup": {
      "q": "Модель данных и сетевой сервис — что чем?",
      "a": "Модель `struct`, сервис `class`; shared mutable → `actor`."
    },
    "deep": "**`struct` когда:** значение, а не сущность (координаты, конфиг, результат); копия = независимый объект; иммутабельность для предсказуемости; хранение в коллекциях.\n\n**`class` когда:** identity (`===`); shared mutable state видно всем держателям (кэш, репозиторий, плеер, модель с подписчиками); жизненный цикл и интеграция с Cocoa (`UIView`, `URLSessionTask`, KVO/`@objc`).\n\n*Источники:* Swift Language Guide — Structures and Classes; Swift Concurrency (actors).",
    "sources": "Swift Language Guide — Structures and Classes; Swift Concurrency (actors)."
  },
  {
    "id": "Классы-и-структуры-q6",
    "q": 6,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Работает ли ARC со структурами?",
    "level": "medium",
    "promptType": "reason",
    "cue": "Работает ли ARC со структурами?",
    "core": "ARC считает ссылки только на **объекты классов** (heap) — у самой `struct` нет retain/release. Но если внутри есть `class`/замыкание, ARC работает для **этих полей** при копировании структуры.",
    "why": "Value-тип живёт по scope и копируется целиком — считать ссылки не на что. А reference-поле внутри — это настоящая ссылка, её ARC ведёт.",
    "trap": "«struct = без ARC» верно только про саму обёртку. Выбор `struct` не выключает ARC, если внутри классы/замыкания.",
    "anchor": "Struct — конверт без счётчика. ARC не считает конверты, только объекты-вложения внутри них.",
    "phrase": "ARC не управляет самой структурой, но работает для её reference-полей.",
    "followup": {
      "q": "`struct S { var onTap: () -> Void }` — есть работа ARC при копии S?",
      "a": "Да, замыкание — reference (и потенциальный retain cycle)."
    },
    "deep": "```swift\nfinal class C { deinit { print(\"deinit\") } }\nstruct S { var obj: C }\n\ndo {\n    var s = S(obj: C())\n    let s2 = s        // value-копия копирует ссылку на C → ARC: +1 retain\n    _ = s2\n}                     // выход из scope → ARC освободит C, когда счётчик = 0\n```\n\nГде физически лежит struct (stack/heap/inline) — оптимизация компилятора, семантику не меняет.\n\n*Источники:* Swift Language Guide — ARC; Instruments (Allocations).",
    "sources": "Swift Language Guide — ARC; Instruments (Allocations)."
  },
  {
    "id": "Классы-и-структуры-q7",
    "q": 7,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Какой тип диспетчеризации у value-типов?",
    "level": "medium",
    "promptType": "tell",
    "cue": "Какой dispatch у value-типов и когда появляется динамика?",
    "core": "По умолчанию value-типы используют **static (direct) dispatch** — компилятор знает реализацию, зовёт напрямую (+ шанс на inlining). Динамика (**witness table**) появляется при вызове через протокол (`any P` или generic).",
    "why": "У value-типа нет наследования → нечего разрешать в рантайме; протокол вводит уровень абстракции, который резолвится через таблицу.",
    "trap": "",
    "anchor": "Знаешь номер — звонишь напрямую (static). Через протокол — сперва смотришь в справочник-таблицу (witness), потом звонишь.",
    "phrase": "Value-типы в основном static dispatch; динамика — при вызовах через протоколы, там witness table.",
    "followup": {
      "q": "Вызов метода struct через `any P` — какой dispatch?",
      "a": "Witness table. (`vtable` — про классы, message dispatch — про `@objc dynamic`.)"
    },
    "deep": "```swift\nstruct Counter { var value = 0; mutating func inc() { value += 1 } }\nvar c = Counter(); c.inc()          // static/direct dispatch\n\nprotocol P { func f() }\nstruct S: P { func f() {} }\nlet p: any P = S(); p.f()           // witness table (existential)\n```\n\nЧерез generic с известным конкретным типом компилятор часто специализирует и «разворачивает» вызов в прямой — но механизм протокола это witness.\n\n*Источники:* Swift ABI / witness tables, WWDC по generics.",
    "sources": "Swift ABI / witness tables, WWDC по generics."
  },
  {
    "id": "Классы-и-структуры-q8",
    "q": 8,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Как работает `mutating` и когда он нужен?",
    "level": "medium",
    "promptType": "tell",
    "cue": "Зачем value-типу `mutating` и почему классу он не нужен?",
    "core": "`mutating` нужен методам `struct`/`enum`, которые меняют `self` или его поля (без него value-тип «заморожен»). В протоколе фиксирует контракт «реализация может менять self». Классу не нужен — он меняется по ссылке.",
    "why": "Value-тип в `let` иммутабелен — нужна явная пометка, что метод изменяет значение. У класса сам `self` (ссылка) не заменяется → пометка не требуется.",
    "trap": "`mutating` — про изменение value-типа, а **не** про многопоточность.",
    "anchor": "`mutating` = табличка «вошёл в режим редактирования себя». Value-типу нужна; класс правит по ссылке — табличка не требуется.",
    "phrase": "mutating отмечает методы, меняющие self; нужен в протоколе, чтобы struct/enum его реализовали. Класс выполняет тот же контракт без mutating.",
    "followup": {
      "q": "Класс реализует протокол с `mutating func` — пишем `mutating`?",
      "a": "Нет. Бонус: `mutating` позволяет `self = ...` целиком (часто в enum-машинах)."
    },
    "deep": "```swift\nstruct Counter {\n    private(set) var value = 0\n    mutating func inc() { value += 1 }   // без mutating — ошибка компиляции\n}\n\nenum State {\n    case idle, loading, loaded(Int)\n    mutating func setLoaded(_ v: Int) { self = .loaded(v) }   // переприсвоение self\n}\n\nprotocol Resettable { mutating func reset() }\nstruct S: Resettable { var x = 10; mutating func reset() { x = 0 } }\nfinal class C: Resettable { var x = 10; func reset() { x = 0 } } // без mutating\n```\n\n**Мутацией считается:** запись в stored property, вызов другого `mutating`, `inout`-доступ к `self`, переприсвоение `self`.\n\n*Источники:* Swift Language Guide — Methods (Mutating), Protocols.",
    "sources": "Swift Language Guide — Methods (Mutating), Protocols."
  },
  {
    "id": "Классы-и-структуры-q9",
    "q": 9,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Stored vs computed properties и layout",
    "level": "medium",
    "promptType": "compare",
    "cue": "Чем stored-свойства отличаются от computed и как это влияет на память?",
    "core": "**Stored** хранит значение физически в экземпляре → влияет на `size`/`stride`/`alignment` (и на ABI). **Computed** — это геттер/сеттер (код, не данные) → размер экземпляра **не** меняет. `lazy` — это тоже stored.",
    "why": "stored нужно где-то хранить; computed вычисляется при обращении из других данных — хранить нечего.",
    "trap": "Stored-поля влияют на **ABI**: добавил/переставил → сломал бинарную совместимость публичной библиотеки.",
    "anchor": "Stored — товар на полке (занимает место). Computed — ценник, пересчитываемый по формуле (места не занимает).",
    "phrase": "Stored — память экземпляра, влияет на size/stride и ABI; computed — функции, места не занимают; lazy — stored с отложенной инициализацией.",
    "followup": {
      "q": "Добавил computed property — экземпляр стал больше?",
      "a": "Нет, 0 байт (проверяется `MemoryLayout`)."
    },
    "deep": "```swift\nstruct Rect {\n    var w, h: Double\n    var area: Double { w * h }                    // computed read-only — 0 байт\n    var side: Double { get { w } set { w = newValue; h = newValue } }\n}\n\nstruct A { var x: Int }\nstruct B { var x: Int; var y: Int { x } }\nMemoryLayout<A>.size   // 8 (64-bit)\nMemoryLayout<B>.size   // тоже 8: computed не добавил хранения\n```\n\nЧастый приём — computed API поверх stored backing (`_age` хранит, `age` валидирует в сеттере): размер определяет `_age`.\n\n*Источники:* Swift Language Guide — Properties; Library Evolution (ABI); `MemoryLayout`.",
    "sources": "Swift Language Guide — Properties; Library Evolution (ABI); `MemoryLayout`."
  },
  {
    "id": "Классы-и-структуры-q10",
    "q": 10,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Exclusivity enforcement (Law of Exclusivity)",
    "level": "hard",
    "promptType": "tell",
    "cue": "Что такое exclusivity enforcement (закон эксклюзивности)?",
    "core": "Swift требует **эксклюзивного доступа**: нельзя пересекающиеся обращения к одной области памяти, если хотя бы одно из них — **запись**. Касается `inout`, `mutating`, элементов коллекций, subscript. Это про один контекст, **не** про потоки.",
    "why": "Гарантия «мутация = эксклюзивная транзакция» даёт компилятору право оптимизировать (reordering/inlining) без изменения наблюдаемого поведения.",
    "trap": "Это **не** thread-safety: data race между потоками остаётся (нужны actors/синхронизация). Часть случаев ловится в рантайме (trap), а не на компиляции.",
    "anchor": "Пока кто-то переодевается (write) — примерочная занята, никто не входит. Но это правило одной примерочной, не охрана всего магазина (потоки — отдельно).",
    "phrase": "Закон эксклюзивности запрещает перекрывающиеся доступы, если хоть один — запись. Это про корректность в одном контексте, не про межпоточную безопасность.",
    "followup": {
      "q": "`swap(&x, &x)` — что будет?",
      "a": "Ошибка overlapping access (ловится компилятором)."
    },
    "deep": "```swift\nfunc swapInts(_ a: inout Int, _ b: inout Int) { let t = a; a = b; b = t }\nvar x = 1\n// swapInts(&x, &x)   // ❌ overlapping access — компилятор не разрешит\n\nstruct S {\n    var arr = [1, 2, 3]\n    subscript(i: Int) -> Int { get { arr[i] } set { arr[i] = newValue } }\n}\nfunc g(_ x: inout Int, _ y: inout Int) { x += 1; y += 1 }\nvar s = S()\n// g(&s[0], &s[1])     // ❌ часто запрещено: overlapping через subscript\n```\n\n*Источники:* Swift Evolution — Law of Exclusivity; WWDC по memory safety.",
    "sources": "Swift Evolution — Law of Exclusivity; WWDC по memory safety."
  },
  {
    "id": "Классы-и-структуры-q11",
    "q": 11,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "TEXT и DATA сегменты памяти",
    "level": "hard",
    "promptType": "list",
    "cue": "Перечисли сегменты памяти (TEXT/DATA/BSS…) и их права доступа.",
    "core": "Секции образа процесса (Mach-O). **TEXT** (`__TEXT`) — код + read-only константы, **RX** (read+execute). **DATA** (`__DATA`) — инициализированные глобальные/статические, **RW**. **BSS** — неинициализированные (обнуляются при старте). Рядом: **Heap** и **Stack**.",
    "why": "Безопасность: **W^X** — страница либо пишется, либо исполняется, но не одновременно (+ ASLR, code signing) → код нельзя подменить в рантайме.",
    "trap": "",
    "anchor": "TEXT — печатная книга: читай/исполняй, но не пиши в неё (RX). DATA — рабочая тетрадь: пиши и читай (RW). BSS — чистые, заранее обнулённые страницы.",
    "phrase": "TEXT — код и константы (read+execute), DATA — инициализированные глобальные (read+write), BSS — неинициализированные (обнуляются). Разделение + W^X — про безопасность.",
    "followup": {
      "q": "Глобальная `var g: Int` без значения — какой сегмент?",
      "a": "BSS (память выделяется и обнуляется при старте)."
    },
    "deep": "- **Stack:** локальные переменные, кадры вызовов; быстро, LIFO, ограничен по размеру.\n- **Heap:** динамические аллокации (объекты классов, буферы коллекций, ARC-managed); гибко, но дороже.\n\n```swift\nvar g1 = 10                       // глобальная инициализированная → DATA\nvar g2: Int                       // глобальная без init → BSS\nstruct S { static var x = 1 }     // статическая → DATA/BSS\nfunc f() {\n    let a = 1                     // часто stack / регистры\n    let obj = NSObject()          // объект → heap, указатель может лежать на stack\n}\n```\n\nТочный набор секций (`__DATA_CONST`, `__LINKEDIT`…) зависит от toolchain — важен смысл RX vs RW.\n\n*Источники:* Mach-O format, dyld, iOS memory protection (W^X, ASLR).",
    "sources": "Mach-O format, dyld, iOS memory protection (W^X, ASLR)."
  },
  {
    "id": "Классы-и-структуры-q12",
    "q": 12,
    "deck": "Классы-и-структуры",
    "topic": "Классы и структуры",
    "title": "Проектирование value-типов без лишних копий и ARC",
    "level": "hard",
    "promptType": "list",
    "cue": "Как проектировать value-типы без лишних копий и retain/release? Перечисли приёмы.",
    "core": "Держать value-типы **маленькими и плоскими**, опираться на CoW стандартных типов и не ломать его, минимизировать reference-поля, мутировать пачкой (`inout`/batching) — чтобы сохранить value semantics без лишних копий и retain/release.",
    "why": "Каждая копия struct = retain/release всех её class-полей + возможная уникализация буфера; в горячем цикле это бьёт по скорости.",
    "trap": "`Data ↔ [UInt8]` и slices молча копируют; цепочки `.map().filter().sorted()` плодят промежуточные буферы.",
    "anchor": "Лёгкий рюкзак копировать дёшево; набил классами-гирями и копируешь в цикле — каждый раз платишь за ARC и буфер.",
    "phrase": "Держу типы лёгкими, не провоцирую уникализацию в циклах, мутирую через inout/batching, минимизирую class-поля. Большое значение — оборачиваю в кастомный CoW. Проверяю Allocations.",
    "followup": {
      "q": "`.map().filter().sorted()` на большом массиве — в чём риск?",
      "a": "Промежуточные аллокации; лучше один проход или `lazy`."
    },
    "deep": "```swift\nfunc process(_ input: [Int]) -> [Int] {     // batching: одна логическая копия\n    var out = input\n    out.reserveCapacity(out.count)\n    for i in out.indices { out[i] *= 2 }     // in-place, без промежуточных массивов\n    return out\n}\n\nfunc normalize(_ data: inout [Int]) {        // мутация in-place через inout\n    for i in data.indices { data[i] = max(0, data[i]) }\n}\n\ndata.withUnsafeBytes { raw in /* чтение без копии */ }\n```\n\nCoW-обёртка (`class Storage` + `isKnownUniquelyReferenced`) даёт value semantics с контролируемой стоимостью, но требует дисциплины (и не решает thread-safety).\n\n*Источники:* Swift stdlib (Array/Data/String), `isKnownUniquelyReferenced`, Instruments.",
    "sources": "Swift stdlib (Array/Data/String), `isKnownUniquelyReferenced`, Instruments."
  }
];

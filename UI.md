## UI

### Q80 (🟢): Что такое Auto Layout?

**Кратко**
- Auto Layout — система ограничений (constraints), которая вычисляет **размеры и позиции** вью на основе правил (равенства/неравенства) и приоритетов.
- Она решает задачу как систему уравнений, учитывая intrinsic content size, hugging/compression, safe area, layoutMargins.
- Используется для адаптивной вёрстки под разные экраны, локализации, Dynamic Type и изменения ориентации.

**Развёрнуто**
## 1) Идея: “не задаём frame вручную, а описываем правила”
Вместо:
- “кнопка = x: 12, y: 40, w: 100, h: 44”
ты задаёшь:
- “кнопка 12pt от левого края, сверху 40pt, высота 44, справа не дальше чем…”
и система сама считает финальные `frame` на каждом layout pass.

## 2) Что такое constraint
Constraint связывает 2 атрибута:
- `view1.leading = view2.leading + 12`
- `label.width >= 100`
- `imageView.height = imageView.width * 0.75`

Также бывают:
- равенства/неравенства,
- multiplier,
- constant,
- priority.

## 3) Приоритеты и разрешение конфликтов
Когда constraints конфликтуют или не хватает данных:
- Auto Layout использует приоритеты (1…1000),
- constraints с `required (1000)` старается выполнить всегда,
- более низкие — могут быть “сломаны” (broken constraints), чтобы система осталась решаемой.
Если constraints недостаточно → layout becomes ambiguous (неоднозначный).

## 4) Связь с intrinsic content size
Некоторые вью сами “предлагают” размер (label, button, image view).
Auto Layout:
- берёт intrinsic size,
- затем пытается удовлетворить constraints,
- при необходимости использует hugging/compression, чтобы понять, где можно растянуть/сжать.

## 5) Когда Auto Layout пересчитывается
- при изменении constraints,
- при изменении текста/шрифта/контента (intrinsic size),
- при изменении safe area, bounds, trait collection,
- при вызове `setNeedsUpdateConstraints`, `setNeedsLayout`, `layoutIfNeeded`.

## 6) Типичные ошибки
- забыли выключить autoresizing mask:
  - `translatesAutoresizingMaskIntoConstraints = false`
- добавили constraints до добавления view в иерархию или не активировали их.
- конфликтующие required constraints → логи “Unable to simultaneously satisfy constraints”.
- “магические” высоты/ширины, которые ломают Dynamic Type/локализации.

**Самопроверка**
- Оспорено: “Auto Layout = просто удобно расставить frame” — это solver с приоритетами и правилами, который пересчитывает layout при изменениях.
- Неочевидно: Auto Layout не “живёт отдельно” от `layoutSubviews`: финальные `frame` всё равно применяются перед/в `layoutSubviews`.
- Источники: Apple Auto Layout Guide, WWDC по UIKit layout, документация `NSLayoutConstraint` и debugging (ambiguous/broken constraints).

### Q81 (🟢): Что такое intrinsic content size?

**Кратко**
- Intrinsic content size — “естественный” размер вью, который она может определить **сама** из своего контента (текста, изображения, внутренних правил).
- Auto Layout использует его как входные данные, если размер не задан constraints’ами.
- Примеры:
  - `UILabel` зависит от текста/шрифта/numberOfLines,
  - `UIImageView` — от размера изображения,
  - `UIButton` — от title/image + contentEdgeInsets.
- View, у которой нет смысла в intrinsic size (например, `UIView`), обычно имеет `noIntrinsicMetric`.

**Развёрнуто**
## 1) Почему это нужно
Если ты не задал ширину/высоту constraints’ами, Auto Layout всё равно должен понять размер.
Для “контентных” вью он берёт intrinsic size.

Пример: label внутри stackView
- если label имеет текст и шрифт, stackView сможет посчитать её высоту/ширину без явных constraints.

## 2) Как Auto Layout использует intrinsic size
- Intrinsic size участвует как “предпочтительный” размер.
- Если constraints заставляют сделать иначе — вступают в игру:
  - hugging (сопротивление растяжению),
  - compression resistance (сопротивление сжатию).

## 3) Что влияет на intrinsic size
- `UILabel`: текст, шрифт, `numberOfLines`, `preferredMaxLayoutWidth` (важно для многострочных), `lineBreakMode`.
- `UIButton`: content + insets.
- `UIImageView`: image size + content mode (content mode влияет на отображение, но не всегда на intrinsic size; базово intrinsic = размер изображения).
- `UIStackView`: собственного intrinsic почти нет, он вычисляет свой размер из arrangedSubviews.

## 4) Когда intrinsic size пересчитывается
- при смене текста/шрифта/изображения,
- при изменении `preferredMaxLayoutWidth`,
- при вызове `invalidateIntrinsicContentSize()` (для кастомных вью).

## 5) Кастомные вью
Если твоя вью должна “знать свой размер”:
- переопредели `intrinsicContentSize`,
- вызывай `invalidateIntrinsicContentSize()` при изменении данных.

```swift
final class BadgeView: UIView {
    var text: String = "" { didSet { invalidateIntrinsicContentSize() } }

    override var intrinsicContentSize: CGSize {
        // посчитать размер из текста и паддингов
        CGSize(width: 40, height: 20)
    }
}
```

## 6) Типовые проблемы
- Многострочный UILabel без корректной ширины → высота “не сходится”.
  - нужен constraints на ширину (или leading/trailing) и иногда `preferredMaxLayoutWidth` (особенно в нестандартных кейсах).
- Внутри `UIScrollView` без явных constraints на ширину контента — Auto Layout может стать ambiguous.

**Самопроверка**
- Оспорено: “intrinsic size — это размер frame” — нет, это вход для solver’а; итоговый frame может отличаться из-за constraints/приоритетов.
- Неочевидно: content mode обычно не меняет intrinsic size (она про рисование), но может косвенно влиять через другие ограничения/контейнеры.
- Источники: Apple Auto Layout Guide, UIKit docs `intrinsicContentSize`, `invalidateIntrinsicContentSize`, разбор UILabel multi-line layout.

### Q82 (🟢): Что такое hugging и compression resistance?

**Кратко**
- Это приоритеты Auto Layout, которые помогают решить, **какую вью растягивать или сжимать**, когда места “слишком много” или “слишком мало”.
- **Content Hugging Priority** — сопротивление **растяжению** (хочу остаться ближе к intrinsic size).
  - выше hugging → вью меньше растягивают.
- **Compression Resistance Priority** — сопротивление **сжатию** (не хочу быть меньше intrinsic size).
  - выше compression → вью меньше сжимают.
- Есть отдельно по осям: horizontal и vertical.

**Развёрнуто**
## 1) Зачем вообще нужны эти приоритеты
Допустим, horizontal stackView с двумя labels:
- обе имеют intrinsic width,
- но контейнер шире или уже суммы intrinsic.
Auto Layout должен решить:
- кого растягивать (если ширины много),
- кого сжимать/обрезать (если ширины мало).

Hugging/Compression дают “вес” предпочтений.

## 2) Content Hugging (сопротивление растяжению)
Сценарий “лишняя ширина”:
- у кого hugging ниже, того легче растянуть.

Пример:
- TitleLabel: hugging высокий (пусть не растягивается),
- Spacer/ValueLabel: hugging ниже (пусть тянется/занимает остаток).

## 3) Compression Resistance (сопротивление сжатию)
Сценарий “не хватает ширины”:
- у кого compression ниже, того легче сжать (текст будет обрезан/перенесён).

Пример:
- TitleLabel: compression высокий (заголовок важен),
- SubtitleLabel: compression ниже (пусть режется/переносится).

## 4) Приоритеты и конфликт с constraints priorities
Важно:
- Hugging/Compression — это тоже priorities, но они относятся к “неявным” constraints вокруг intrinsic size.
- Они участвуют в решении вместе с явными constraints и их priority.
- Если ты поставил явный required constraint на width, hugging/компрессия обычно уже не помогут: width будет фиксирован.

## 5) Практический пример (две метки в одной строке)
Хотим: левый title фиксируется по контенту, правый value занимает остаток и при нехватке режется.

- TitleLabel:
  - hugging: высокий (не растягивать),
  - compression: высокий (не сжимать).
- ValueLabel:
  - hugging: низкий (пусть растягивается),
  - compression: низкий (пусть сжимается первым).

## 6) Частые ошибки
- Пытаться “починить” конфликт constraints изменением hugging — если конфликт между required constraints, hugging не спасёт.
- Не понимать оси: изменили vertical, а проблема в horizontal.
- Приоритеты одинаковые → система выбирает неочевидно, что вызывает “прыгающий” layout.

**Самопроверка**
- Оспорено: “hugging/компрессия нужны всегда” — они важны, когда есть свободная степень (не задан фиксированный размер) и нужно выбрать, кто растянется/сожмётся.
- Неочевидно: они работают как приоритеты неявных constraints, а не как отдельная магия; поэтому их влияние исчезает при жёстких width/height constraints.
- Источники: Auto Layout priorities, Apple docs по Content Hugging/Compression Resistance, практики stackView layout.

### Q83 (🟢): Что такое safe area?

**Кратко**
- Safe area — область экрана, в пределах которой контент не перекрывается системными элементами (notch, статус-бар, home indicator, toolbars, navigation bars).
- UIKit предоставляет `safeAreaLayoutGuide` и `safeAreaInsets`, чтобы правильно располагать вью.
- Safe area меняется при:
  - повороте,
  - появлении/скрытии системных баров,
  - модальных презентациях,
  - split view / multitasking (iPad).

**Развёрнуто**
## 1) Зачем safe area нужна
Современные устройства имеют:
- вырезы (notch / Dynamic Island),
- индикатор Home,
- системные бары.
Если игнорировать это и верстать “по краям экрана”, важный контент окажется под системными областями.

Safe area задаёт “безопасные” границы для контента.

## 2) Как использовать
### Constraints к safe area
Самый типовой паттерн:
```swift
view.addSubview(header)

NSLayoutConstraint.activate([
    header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
    header.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
    header.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)
])
```

### Доступ к инсетам
- `view.safeAreaInsets` — реальные значения отступов (top/bottom/left/right).
- Их нельзя надёжно читать слишком рано (например, в `viewDidLoad` часто 0). Нормально — после layout:
  - `viewDidLayoutSubviews`,
  - `viewSafeAreaInsetsDidChange`.

## 3) Safe area vs layoutMargins
- Safe area — “не залезать под систему”.
- Layout margins — “внутренние отступы контента для эстетики/читабельности”.
Можно комбинировать: constraints к safe area, затем внутри — с margin’ами.

## 4) Когда safe area НЕ нужна
Иногда контент специально должен идти “под статус-бар”:
- full-bleed фото/видео/фон.
Тогда фон вью можно привязать к edges, а контент (текст/кнопки) — к safe area.

## 5) Важные нюансы
- Внутри контроллера safe area учитывает navigation bar/tab bar (если они есть).
- При презентации (sheet, fullScreen) safe area может измениться.
- На iPad с multitasking safe area и safeAreaInsets меняются при изменении размеров окна.

**Самопроверка**
- Оспорено: “safe area = просто отступ сверху” — нет, это динамическая область, зависящая от устройства и UI chrome (bars, home indicator).
- Неочевидно: safeAreaInsets часто корректны только после первого layout pass; чтение в `viewDidLoad` может дать 0 и вводить в заблуждение.
- Источники: UIKit docs `safeAreaLayoutGuide`, `safeAreaInsets`, `viewSafeAreaInsetsDidChange`, материалы по адаптивной вёрстке под notch/home indicator.

### Q84 (🟢): Что такое content mode?

**Кратко**
- `contentMode` — свойство `UIView`, определяющее **как контент** (чаще всего у `UIImageView`/`CALayer`) размещается внутри bounds вью при отличии размеров.
- Наиболее популярные:
  - `.scaleToFill` (по умолчанию у многих) — растягивает до bounds, может искажать.
  - `.scaleAspectFit` — вписывает, сохраняя пропорции, возможны "поля".
  - `.scaleAspectFill` — заполняет, сохраняя пропорции, возможна обрезка.
  - `.center`, `.top`, `.bottom`, `.left`, `.right` и комбинации.
- `contentMode` влияет на отрисовку/расположение контента, но не является Auto Layout constraint'ом и **не влияет на intrinsic content size**.

**Развёрнуто**
## 1) Что именно контролирует contentMode
Если вью имеет контент, который рисуется внутри её bounds:
- изображение,
- layer contents,
- или кастомное рисование,
то `contentMode` определяет геометрию отображения относительно bounds.

Пример: `UIImageView` 200×200, image 400×100:
- `.scaleAspectFit` покажет всё изображение, будут поля сверху/снизу.
- `.scaleAspectFill` заполнит квадрат, часть изображения обрежется по краям.

## 2) Часто путают: contentMode vs constraints
- Constraints определяют **размер и позицию самой вью**.
- contentMode определяет **как внутри неё** отрисовать контент.
То есть можно иметь одинаковый layout, но разный contentMode → разный вид.

## 3) Intrinsic content size и contentMode
`contentMode` **не влияет** на intrinsic content size вью.
У `UIImageView` intrinsic content size всегда равен размеру изображения, независимо от выбранного contentMode — это свойство отвечает исключительно за способ отрисовки контента внутри bounds, но не за "предпочтительный размер" вью.

## 4) Связь с layout и redraw
Когда bounds меняются (например, из-за Auto Layout), вью может:
- перерисовать контент по правилам contentMode.
Для некоторых режимов (не `.redraw`) система не вызывает `draw(_:)` автоматически, а просто меняет способ размещения.

Если `contentMode = .redraw`, то при изменении bounds будет вызван `setNeedsDisplay` → `draw(_:)` (если есть кастомное рисование).

## 5) Практика и типичные ошибки
- Фото/аватар:
  - чаще `.scaleAspectFill` + `clipsToBounds = true` (или `layer.masksToBounds = true`), иначе вылезет за bounds.
- Иконки, которые не должны искажаться:
  - `.scaleAspectFit`.
- Искажения из-за `.scaleToFill` по умолчанию — частая причина "кривых" картинок.

## 6) Важная связь с masksToBounds
Если используешь `.scaleAspectFill`, часто нужна обрезка:
- `clipsToBounds = true`, иначе изображение может рисоваться за пределами видимой области.

**Самопроверка**
- Оспорено: "contentMode меняет размер вью" — нет, он меняет только способ рисования контента внутри bounds.
- Оспорено: "contentMode влияет на intrinsic content size" — нет, intrinsic size у UIImageView всегда равен размеру изображения, независимо от contentMode.
- Неочевидно: `.redraw` может быть дорогим, потому что провоцирует перерисовку при каждом изменении bounds.
- Источники: UIKit docs `UIView.ContentMode`, поведение `UIImageView` и layer contents, материалы по performance (redraw/overdraw).

### Q85 (🟢): Что такое rendering cycle?

**Кратко**
- Rendering cycle (в контексте UIKit/Core Animation) — повторяющийся цикл “подготовить изменения → собрать дерево слоёв → закоммитить транзакцию → отдать на рендеринг”, обычно синхронизированный с частотой экрана (vsync).
- UIKit меняет свойства вью/слоёв, Core Animation **батчит** изменения в транзакцию, а затем рендерер (часто на отдельном потоке/процессе) композитит кадр.
- Если ты не успеваешь подготовить кадр за бюджет времени (например, ~16.67ms при 60Hz), появляются dropped frames/лагающий скролл.

**Развёрнуто**
## 1) Два этапа: layout/drawing vs compositing
Упрощённо:
1) **Layout**: Auto Layout + `layoutSubviews` считают frames.
2) **Update layer tree**: изменения свойств слоёв (позиции, opacity, transform, contents).
3) **Drawing (если нужно)**: растеризация (draw) для слоёв, которым нужен bitmap (например, `draw(_:)`, текст, изображения, offscreen).
4) **Commit**: Core Animation коммитит транзакцию на конец run loop итерации.
5) **Render/Composite**: рендерер собирает финальный кадр и отдаёт GPU.

UI код в основном готовит данные для рендера, сам рендер может происходить асинхронно.

## 2) Почему говорят “батчинг”
Когда ты пишешь:
```swift
view.alpha = 0.5
view.transform = .init(scaleX: 0.9, y: 0.9)
```
это не означает “сразу перерисовать экран”.
Чаще:
- изменения аккумулируются,
- в конце текущей итерации run loop происходит commit,
- следующий кадр отображает результат.

Поэтому:
- много мелких изменений в одном “тике” можно объединить без лишних перерисовок.

## 3) Где в этом месте анимации
Core Animation анимирует свойства слоёв, интерполируя их значения между кадрами.
Важно: это часто происходит “на стороне рендера”, поэтому некоторые анимации не нагружают main thread сильно (если не триггерят layout/drawing).

## 4) Что ломает smooth rendering
- heavy CPU на main (layout, синхронные операции, JSON, image decode),
- offscreen rendering (маски, тени, cornerRadius+mask),
- сложные self-sizing расчёты на скролле,
- слишком много слоёв/overdraw,
- частые перерасчёты layout без нужды.

## 5) Как объяснить на собесе одной фразой
“UIKit строит и обновляет дерево слоёв, Core Animation батчит изменения и коммитит транзакцию в конце run loop, затем отдельный рендерер композитит кадр под vsync; если подготовка кадра не укладывается в бюджет — видим лаги.”

**Самопроверка**
- Оспорено: “каждое изменение свойства сразу рисует экран” — нет, изменения батчатся и применяются на commit’е, обычно на границе кадра.
- Неочевидно: иногда изменение свойства приводит к layout/draw, а иногда только к изменению layer property (дешевле). Умение отличать это напрямую связано с оптимизацией.
- Источники: Apple Core Animation docs, WWDC про rendering pipeline, Instruments (Core Animation, Time Profiler) и понятия vsync/frame budget.

### Q86 (🟢): Как работает run loop и почему от него зависят таймеры, жесты и отрисовка?

**Кратко**
- Run loop — цикл обработки событий потока: “ждать события → обработать → обновить состояние → заснуть снова”.
- На main thread run loop управляет:
  - доставкой touch/gesture событий,
  - выполнением `Timer`,
  - `performSelector`/input sources,
  - обновлением UI и коммитом Core Animation транзакций.
- Таймеры и жесты зависят от run loop, потому что они “тикают” и доставляются **как события/источники** run loop; если run loop заблокирован, всё это задерживается.

**Развёрнуто**
## 1) Что такое run loop на практике
У каждого потока run loop **может быть**, но гарантированно активно он есть у main thread.
Run loop повторяет:
1) собрать события (input sources),
2) обработать (dispatch),
3) выполнить таймеры,
4) выполнить “отложенные” блоки,
5) перед сном — сделать commit транзакций Core Animation,
6) заснуть до следующего события.

Если ты делаешь тяжёлую работу на main:
- run loop не может обработать input/timers/render → UI “висит”.

## 2) Почему таймеры зависят от run loop
`Timer` (NSTimer) — это run-loop timer:
- он “прикреплён” к run loop и mode,
- срабатывает, когда run loop в подходящем режиме и не занят.

Важные нюансы:
- Timer **не гарантирует точность**: если main занят, fire будет позже.
- Timer привязан к **mode** (например, default vs tracking).

## 3) Почему жесты зависят от run loop
Touch events приходят через event system и попадают в main run loop.
Gesture recognizers работают поверх этого, обрабатывая последовательности touch.
Если main thread блокирован:
- touch события не обрабатываются,
- жесты “не распознаются” вовремя,
- скролл/тапы лагают.

## 4) RunLoop modes
Основные:
- `.default` — обычная работа UI.
- `.tracking` — режим при скролле/перетаскивании.
- `.common` — набор “общих” режимов.

Классический баг:
- Timer добавлен в `.default`, но при скролле run loop в `.tracking` → таймер не тикает.
Решение:
- добавить timer в `.common`.

## 5) Почему от run loop зависит отрисовка
В конце итерации main run loop Core Animation коммитит изменения (CATransaction commit), и кадр готовится к следующему vsync.
Если main занят:
- транзакции не коммитятся вовремя,
- кадры пропускаются,
- анимации/скролл начинают “дропать”.

## 6) Вывод для собеса
Понимание run loop объясняет:
- почему нельзя блокировать main,
- почему таймеры “плывут”,
- почему скролл лагирует,
- почему `.common` важен.

**Самопроверка**
- Оспорено: “Timer тикает независимо” — нет, он обслуживается run loop; блокировка потока задерживает срабатывание.
- Неочевидно: modes — частая причина “почему таймер не работает при скролле”; это не баг Timer, это ожидание не того режима.
- Источники: Apple docs RunLoop/CFRunLoop, Timer scheduling и run loop modes, Core Animation транзакции и commit в run loop.

### Q87 (🟠): Когда вызывается `viewDidLoad` / `viewWillAppear` / `viewDidAppear`?

**Кратко**
- `viewDidLoad` — вызывается **один раз** (обычно) после загрузки `view` в память, до первого показа. Хорошо для “однократной” настройки UI/биндингов.
- `viewWillAppear` — вызывается **каждый раз перед появлением** на экране (перед анимацией). Хорошо для обновления UI, который должен быть актуален к моменту показа.
- `viewDidAppear` — вызывается **после появления** (после анимации). Хорошо для стартов анимаций, аналитики, запуска тяжелее действий, которые не должны тормозить переход.

**Развёрнуто**
## 1) `viewDidLoad`
Когда:
- когда `view` контроллера впервые создана/загружена (из кода или storyboard/nib),
- вызывается один раз на жизненный цикл контроллера (если `view` не выгружается из памяти).

Типичные задачи:
- построить UI, добавить subviews, настроить constraints,
- настроить initial state, подписки/observations,
- подготовить data sources, register cells.

Важно:
- размеры view ещё могут быть не финальными (layout будет позже).
- safeAreaInsets в этот момент могут быть ещё некорректны (часто 0).

## 2) `viewWillAppear(_:)`
Когда:
- каждый раз перед тем как view станет видимой.
- вызывается перед анимацией появления (push/present/tab switch).

Типичные задачи:
- обновить данные/текст/кнопки, которые могли измениться пока экран был скрыт,
- показать/скрыть navigation bar, настроить статус-бар/ориентацию (если нужно),
- начать lightweight подписки, которые актуальны только когда экран видим.

Опасность:
- тяжёлые операции здесь ухудшат анимацию перехода.

## 3) `viewDidAppear(_:)`
Когда:
- после того, как экран уже появился (анимация завершилась).

Типичные задачи:
- запуск анимаций, которые должны стартовать после появления,
- старт видео/камера (часто), запросы разрешений (чтобы не ломать transition),
- показ UIAlert/BottomSheet (во избежание “present while presenting”),
- аналитика “screen viewed”.

## 4) Практические нюансы
- При `push`/`pop` и при переключении табов методы вызываются предсказуемо:
  - “появляющийся” экран получает will/didAppear,
  - “скрывающийся” получает will/didDisappear.
- При частичном перекрытии (например, sheet) порядок может быть нетривиальным: underlying VC может получать `viewWillDisappear` не всегда так, как ожидаешь — зависит от presentation style.

## 5) “Один раз” — не абсолютная гарантия
`viewDidLoad` может сработать снова, если:
- `view` выгрузили и создали заново (редко в современных iOS, но возможно при memory pressure и если `view` пересоздаётся).
Но обычно в iOS приложениях это “один раз на жизнь VC”.

**Самопроверка**
- Оспорено: “в `viewDidLoad` можно полагаться на финальные размеры” — нет, финальные bounds/safe area чаще доступны после layout (например, `viewDidLayoutSubviews`).
- Неочевидно: choice места для тяжёлой работы влияет на плавность анимаций; `viewWillAppear` легко испортить переход.
- Источники: UIKit docs UIViewController lifecycle, Apple guides по view controller programming, практики по timing для present/animations/analytics.

### Q88 (🟠): Чем отличается `layoutSubviews` от `updateConstraints`?

**Кратко**
- `updateConstraints()` — место, где вью **обновляет/создаёт constraints** (Auto Layout). Вызывается перед layout pass, когда системе нужно пересчитать constraints.
- `layoutSubviews()` — место, где вью **раскладывает subviews** (устанавливает frames) после того, как Auto Layout (или ручной layout) решил размеры.
- Простое правило:
  - constraints меняем в `updateConstraints`,
  - frames меняем в `layoutSubviews`.

**Развёрнуто**
## 1) `updateConstraints()`: про правила
Auto Layout вызывает этот метод, когда нужно обновить ограничения.
Сценарии:
- ты вызвал `setNeedsUpdateConstraints()`,
- поменялись traits/контент, требующие других constraints,
- система решила, что constraints устарели.

Как использовать:
- создавать constraints один раз и активировать,
- при изменениях — обновлять constants/активность.
- обязательно вызвать `super.updateConstraints()`.

Типовой паттерн:
```swift
final class CardView: UIView {
    private var didSetup = false
    private var heightConstraint: NSLayoutConstraint!

    override func updateConstraints() {
        if !didSetup {
            // создать и активировать constraints
            didSetup = true
        }
        heightConstraint.constant = 120
        super.updateConstraints()
    }
}
```

Чего НЕ делать:
- не трогать frames (это не тот этап),
- не создавать новые constraints каждый раз без деактивации старых (накопишь дубликаты и конфликты).

## 2) `layoutSubviews()`: про геометрию
Вызывается когда:
- изменились bounds,
- изменились constraints и система сделала layout pass,
- ты вызвал `setNeedsLayout()` / `layoutIfNeeded()`.

Что делать:
- вручную выставлять frames тем subviews, которые ты лейаутнишь без Auto Layout,
- синхронизировать layer geometry (cornerRadius по bounds, shadowPath и т.п.),
- корректировать зависящие от размера вещи.

Пример:
```swift
override func layoutSubviews() {
    super.layoutSubviews()
    layer.cornerRadius = bounds.height / 2
    layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: layer.cornerRadius).cgPath
}
```

Чего избегать:
- менять constraints здесь без необходимости: это может вызвать циклы layout.
(Если нужно — меняй constraints и вызывай `setNeedsUpdateConstraints`, но осторожно.)

## 3) Где происходит порядок в пайплайне
Упрощённо:
- система помечает constraints/layout как “грязные”,
- вызывает `updateConstraints` (если нужно),
- решает Auto Layout,
- затем вызывает `layoutSubviews`.

## 4) Типичные баги
- Создавать constraints в `layoutSubviews` → дубликаты/конфликты, “прыгающий” layout.
- Изменять constraints постоянно без guard’ов → рекурсивные layout passes.
- Не вызывать `super` → странное поведение.

**Самопроверка**
- Оспорено: “layoutSubviews вызывается только один раз” — он может вызываться много раз при любых изменениях размеров/constraints.
- Неочевидно: `updateConstraints` не гарантированно вызывается на каждый `layoutSubviews`; он вызывается только когда constraints помечены как needing update.
- Источники: UIKit docs `updateConstraints`, `layoutSubviews`, Apple Auto Layout lifecycle и debugging layout passes.

### Q89 (🟠): Что такое `setNeedsLayout` / `layoutIfNeeded`?

**Кратко**
- `setNeedsLayout()` — помечает view как требующую layout; реальный `layoutSubviews()` будет вызван **позже**, в ближайший layout pass.
- `layoutIfNeeded()` — если layout “грязный”, выполняет layout **сейчас** (в пределах текущего call stack) и вызывает `layoutSubviews()` для нужных вью.
- Частый паттерн: поменяли constraints → `layoutIfNeeded()` внутри `UIView.animate`, чтобы анимировать изменения.

**Развёрнуто**
## 1) `setNeedsLayout()`
Это “ленивый” запрос:
- не делает layout мгновенно,
- просто говорит системе: “к следующему проходу пересчитай layout”.

Используется когда:
- поменялись данные, влияющие на layout,
- ты не хочешь/не можешь пересчитывать прямо сейчас,
- хочешь батчить несколько изменений в один pass.

## 2) `layoutIfNeeded()`
Это “принудительный” проход:
- если у вью или её предков есть pending layout changes — они будут применены сейчас.
Важно:
- layout идёт сверху вниз по иерархии, поэтому иногда нужно вызывать `layoutIfNeeded()` на родителе/контейнере.

## 3) Типовой кейс: анимация constraints
```swift
NSLayoutConstraint.activate([/* ... */])
view.layoutIfNeeded()

UIView.animate(withDuration: 0.3) {
    constraint.constant = 200
    view.layoutIfNeeded() // анимирует переход к новому layout
}
```

Почему так работает:
- внутри animation block Core Animation интерполирует изменения frames, полученные после layout pass.

## 4) Отличие от `setNeedsUpdateConstraints`
- `setNeedsUpdateConstraints()` — пометить, что нужно пересчитать constraints (этап Auto Layout).
- `setNeedsLayout()` — пометить, что нужно пересчитать frames (layout этап).
Часто при изменении constraints ты вызываешь:
- `setNeedsUpdateConstraints()` → потом `setNeedsLayout()` (UIKit может сделать это сам, но не всегда очевидно).

## 5) Подводные камни
- Чрезмерные `layoutIfNeeded()` в горячих местах (например, в scroll callbacks) могут убить performance.
- Неправильный уровень вызова:
  - `layoutIfNeeded()` на самой сабвью иногда ничего не делает, если надо пересчитать контейнер.

**Самопроверка**
- Оспорено: “setNeedsLayout сразу вызывает layoutSubviews” — нет, это только флаг; выполнение позже.
- Неочевидно: `layoutIfNeeded()` может каскадировать вверх/вниз по иерархии; важно вызывать на правильном контейнере.
- Источники: UIKit docs по layout cycle, практики анимации constraints, статьи/WWDC про эффективные layout passes.

### Q90 (🟠): Что такое `setNeedsDisplay`?

**Кратко**
- `setNeedsDisplay()` помечает вью как требующую перерисовки: система вызовет `draw(_:)` **позже**, в ближайший drawing pass.
- `setNeedsDisplay(_ rect:)` — перерисовать только часть области (грязный прямоугольник).
- Используется, когда меняются данные, влияющие на кастомное рисование (`draw(_:)`), но ты не хочешь/не можешь рисовать прямо сейчас.

**Развёрнуто**
## 1) Layout vs Display
Важно различать:
- Layout (`setNeedsLayout`) — пересчитать frames.
- Display (`setNeedsDisplay`) — пересчитать пиксели (bitmap) для вью, которая рисует сама.

Можно поменять layout и не трогать display (если вью ничего не рисует кастомно), и наоборот.

## 2) Когда реально вызывается `draw(_:)`
Система вызывает `draw(_:)` если:
- вью помечена как needing display,
- вью видима,
- и у неё есть кастомное рисование (или `contentMode = .redraw`).

`setNeedsDisplay()` не рисует немедленно — он ставит флаг.

## 3) Почему “позже” полезно
UIKit/Core Animation батчит перерисовку:
- если ты 5 раз подряд вызвал `setNeedsDisplay()`, скорее всего нарисуется один раз на следующий pass.
Это снижает лишнюю работу.

## 4) Частичный redraw
`setNeedsDisplay(in:)` позволяет сказать:
- “перерисуй только этот прямоугольник”.
Но в реальности оптимизация зависит от того, как система и твой код используют dirty rect; в iOS это не всегда даёт линейную экономию, но концептуально полезно.

## 5) Типовые use cases
- кастомные графики/чарты,
- рисование штрихов/масок/путей,
- кастомные controls (badge, progress ring),
- когда меняется цвет/параметры рисования.

## 6) Подводные камни
- Частые `setNeedsDisplay` в быстром цикле → CPU heavy, dropped frames.
- Рисовать в `draw(_:)` тяжёлые операции (парсинг, I/O, загрузка изображений) — нельзя.
- Для простых эффектов часто лучше использовать Core Animation свойства (layer) вместо draw.

**Самопроверка**
- Оспорено: “setNeedsDisplay сразу рисует” — нет, это лишь пометка; рисование произойдёт на ближайшем drawing pass.
- Неочевидно: если вью не реализует `draw(_:)` и не использует `.redraw`, `setNeedsDisplay` может не дать ожидаемого эффекта (или эффект будет через layer contents), поэтому важно понимать, что именно рисует вью.
- Источники: UIKit docs `setNeedsDisplay`, Core Graphics drawing lifecycle, материалы по performance кастомного рисования.

### Q91 (🟠): Как работает `draw(_:)`?

**Кратко**
- `draw(_:)` — метод `UIView`, в котором происходит **кастомное рисование** (обычно Core Graphics) в текущий графический контекст.
- Вызывается системой, когда вью помечена на перерисовку (`setNeedsDisplay`) и требуется обновить её содержимое.
- `draw(_:)` не вызывают напрямую; вызывают `setNeedsDisplay()` / `setNeedsDisplay(in:)`.
- Должен быть быстрым: медленное рисование → dropped frames.

**Развёрнуто**
## 1) Модель рисования UIView
Когда `UIView` нужно перерисовать:
- UIKit создаёт/использует backing store (bitmap),
- устанавливает текущий `CGContext`,
- вызывает `draw(_ rect: CGRect)` твоей вью,
- результат становится `contents` слоя и участвует в композиции кадра.

Внутри `draw(_:)` ты рисуешь “пиксели”:
- линии, заливки, текст, пути, изображения.

## 2) Как получить контекст
Внутри `draw(_:)`:
```swift
override func draw(_ rect: CGRect) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }
    ctx.setFillColor(UIColor.red.cgColor)
    ctx.fill(rect)
}
```

## 3) Когда `draw(_:)` вызывается
- после `setNeedsDisplay()` (или `.redraw` при изменении bounds),
- когда вью стала видимой,
- при некоторых системных событиях (например, если содержимое было сброшено и нужно восстановить).

Важно:
- `draw(_:)` не обязательно вызывается на каждом кадре.
- Он вызывается, когда система считает, что backing bitmap “грязный”.

## 4) Порядок относительно layout
Обычно:
- сначала layout (frames),
- затем, если нужно, display pass (draw).
Именно поэтому `rect` в `draw(_:)` уже соответствует актуальным bounds.

## 5) Почему нельзя делать “тяжёлое” в draw
`draw(_:)` часто вызывается на main thread:
- если ты делаешь там парсинг, чтение с диска, сложные вычисления — ты блокируешь run loop.
Результат:
- лагающий скролл,
- отвал анимаций,
- повышенное энергопотребление.

Правило:
- подготовь данные заранее,
- в `draw` только рисуй.

## 6) Оптимизации и альтернативы
- Кэшировать результаты (path, layout текста), если параметры не меняются.
- Рисовать только dirty rect (если применимо).
- Для анимируемых эффектов чаще выгоднее:
  - использовать `CAShapeLayer`/`CALayer` и свойства слоя,
  - вместо постоянного redraw’а.

## 7) Типичные баги
- Не вызывают `setNeedsDisplay` при смене данных → картинка не обновляется.
- Делают `setNeedsDisplay` слишком часто → просадка fps.
- Используют `UIGraphicsBeginImageContext` внутри draw (лишняя работа).

**Самопроверка**
- Оспорено: “draw вызывается каждый кадр” — нет, только при необходимости (dirty), иначе слой просто композитится.
- Неочевидно: рисование может быть дорогим из-за offscreen bitmap; иногда лучше переложить на слои (shape/text) и GPU-композитинг.
- Источники: Apple docs UIView drawing, Core Graphics, Core Animation backing store, performance guidelines for drawing.

### Q92 (🟠): Что такое offscreen rendering?

**Кратко**
- Offscreen rendering — когда Core Animation вынужден сначала отрисовать слой **в отдельный буфер** (вне экрана), а затем скомпозитить результат на экран.
- Это дороже, потому что добавляет:
  - создание/управление дополнительным буфером,
  - лишний проход рендера,
  - дополнительную нагрузку на GPU/память/бэндвидс.
- Частые триггеры:
  - `masksToBounds`/`clipsToBounds` на слое с контентом (особенно в сочетании с `cornerRadius`),
  - тени (`shadow*`) без `shadowPath`,
  - маски (`mask`), `UIVisualEffectView`, группы прозрачности (group opacity), некоторые фильтры/blur.

**Развёрнуто**
## 1) Почему вообще возникает offscreen
GPU любит простую композицию:
- взять текстуры слоёв и наложить их друг на друга.
Но некоторые эффекты требуют "промежуточного результата":
- обрезка по радиусу (mask),
- тень по форме,
- сложная маска/альфа-композиция.
Чтобы это посчитать, нужно сначала "нарисовать слой отдельно", применить эффект, и только потом наложить на экран.

Это и есть offscreen rendering.

## 2) `cornerRadius` и `masksToBounds`: важный нюанс
`cornerRadius` **сам по себе** не всегда вызывает offscreen rendering.
Начиная с iOS 13+, для простых случаев (однородный фон без subviews) `cornerRadius` без `masksToBounds` не требует offscreen прохода.

Ключевой триггер — именно **клиппинг содержимого** (`masksToBounds = true`/`clipsToBounds = true`) в сочетании с контентом внутри слоя. Если у слоя нет subviews или сложного содержимого — стоимость может быть значительно ниже.

## 3) Как распознать, что он происходит
### Признаки
- лаги при скролле, особенно когда много одинаковых карточек с радиусами/тенями.
- высокая GPU нагрузка при относительно небольшой нагрузке CPU.

### Инструменты
- Instruments → Core Animation:
  - "Color Offscreen-Rendered" (подсветка offscreen слоёв),
  - FPS/Render stats.
- Xcode → Debug View Hierarchy иногда помогает увидеть подозрительные комбинации.

## 4) Типовые причины и фиксы
### A) `cornerRadius + masksToBounds`
Причина:
- нужно обрезать содержимое по скруглению.

Фиксы:
- избегать `masksToBounds` там, где можно:
  - сделать радиус на отдельном container слое,
  - а тень — на внешнем слое (тень не работает, если masksToBounds = true).
- для картинок — иногда проще заранее подготовить изображение с радиусом (если статично).

### B) Тени без `shadowPath`
Причина:
- система должна вычислить форму тени динамически по пикселям.

Фикс:
- задать `shadowPath` в `layoutSubviews`:
```swift
layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: 12).cgPath
```
Это сильно снижает стоимость.

### C) Маски, blur, сложная альфа-композиция
Фикс:
- минимизировать площадь,
- кэшировать/растрировать (иногда),
- упрощать иерархию.

## 5) Важное: offscreen не всегда "зло"
Если элемент один и не скроллится — может быть нормально.
Проблема, когда:
- много элементов (таблица/коллекция),
- площадь большая,
- эффект меняется часто.

**Самопроверка**
- Оспорено: "cornerRadius сам по себе всегда вызывает offscreen" — нет; начиная с iOS 13+, для простых случаев без subviews это не так. Ключевой триггер — `masksToBounds` с содержимым внутри.
- Неочевидно: тени без `shadowPath` — один из самых частых реальных источников GPU лагов; фикс простой, но про него забывают.
- Источники: Apple Core Animation performance guide, Instruments Core Animation (offscreen highlight), практики оптимизации списков (rounded corners/shadows).

### Q93 (🟠): Что такое rasterization?

**Кратко**
- Rasterization (в UIKit/Core Animation) — превращение векторного/слойного контента в **готовый bitmap (текстуру)**, чтобы потом быстро композитить её на GPU.
- В Core Animation это часто про `layer.shouldRasterize = true`:
  - слой (и его подслои) рендерится один раз в bitmap,
  - затем этот bitmap используется при последующих кадрах.
- Полезно, если контент сложный, но **не меняется** часто.
- Вредно, если контент/transform меняется часто или меняется scale: придётся растрировать снова, можно получить размытость и лишнюю память.

**Развёрнуто**
## 1) Зачем вообще нужна растризация
Если у тебя сложное дерево слоёв (много sublayers, masks, text, gradients):
- каждый кадр композитить его дорого.
Если же элемент статичен, можно один раз:
- нарисовать “итоговую картинку” (bitmap),
- и дальше композитить как одну текстуру.

Это уменьшает стоимость композиции.

## 2) `shouldRasterize` и `rasterizationScale`
```swift
layer.shouldRasterize = true
layer.rasterizationScale = UIScreen.main.scale
```

`rasterizationScale` важен:
- иначе bitmap может быть рассчитан в 1x и выглядеть мыльно на 2x/3x экранах.

## 3) Когда это реально помогает
- Сложные эффекты, которые не меняются:
  - статичная карточка с множеством слоёв,
  - сложный vector drawing, который редко обновляется.
- Когда элемент двигается как единое целое (например, анимируется position/opacity), но внутренности не меняются.

## 4) Когда это ухудшает
- Если слой часто меняет содержимое:
  - меняется текст, изображения, constraints, alpha и т.п. → растеризация будет происходить постоянно.
- Если слой масштабируется/вращается:
  - bitmap может перерисовываться с другим scale,
  - или будет выглядеть размыто.
- Если много разных элементов в списке:
  - кэширование bitmap’ов может раздувать память и вызвать pressure.

## 5) Rasterization vs offscreen rendering
Их часто путают:
- Offscreen — вынужденный промежуточный буфер для эффекта (может быть каждый кадр).
- Rasterization — намеренный кэш bitmap’а, чтобы избежать повторной сложной отрисовки.

Иногда rasterization используют, чтобы уменьшить стоимость эффекта, который вызывает offscreen, но это “лекарство” не всегда подходит.

## 6) Практический подход
- Не включать `shouldRasterize` “на всякий случай”.
- Проверять в Instruments (Core Animation) и замерять:
  - стало ли меньше GPU времени/композита,
  - не выросла ли память/перерисовки.

**Самопроверка**
- Оспорено: “rasterization всегда ускоряет” — нет, она помогает только при статичном/редко меняющемся содержимом; иначе даёт обратный эффект.
- Неочевидно: неправильный `rasterizationScale` делает контент мыльным — частая ошибка, из-за которой rasterization “видна” глазами.
- Источники: Apple Core Animation performance, документация CALayer `shouldRasterize`, инструменты Core Animation в Instruments.

### Q94 (🟠): Как работает `UITableView` reuse?

**Кратко**
- Reuse — механизм переиспользования ячеек: table view не создаёт ячейку на каждую строку, а держит пул “невидимых” и переиспользует их для новых indexPath при скролле.
- Ты регистрируешь класс/nib и dequeuing делаешь через `dequeueReusableCell(withIdentifier:for:)`.
- Обязательное правило: ячейка должна быть **полностью сконфигурирована** в `cellForRowAt`, потому что она может прийти “с прошлым содержимым”.

**Развёрнуто**
## 1) Зачем reuse нужен
Если бы таблица создавала тысячи ячеек сразу:
- память и время создания убили бы performance.
Вместо этого она создаёт примерно столько ячеек, сколько помещается на экране + небольшой запас.
При скролле:
- старые уходят в пул reuse,
- новые берутся из пула и настраиваются под новые данные.

## 2) Как выглядит стандартный путь
```swift
tableView.register(MyCell.self, forCellReuseIdentifier: "MyCell")

func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "MyCell", for: indexPath) as! MyCell
    cell.configure(with: model[indexPath.row])
    return cell
}
```

`dequeueReusableCell(..., for:)` гарантирует:
- что ячейка всегда вернётся (или будет создана), если ты зарегистрировал идентификатор.

## 3) Reuse lifecycle: `prepareForReuse`
Перед тем как ячейка попадёт в reuse-пул или будет выдана заново, UIKit вызывает:
- `prepareForReuse()`.

Там сбрасывают:
- изображения/тексты в дефолт,
- скрытия/альфы,
- отменяют async загрузки (если ты их стартовал),
- сбрасывают state selection/highlight, если нужно.

Пример:
```swift
override func prepareForReuse() {
    super.prepareForReuse()
    imageView?.image = nil
    task?.cancel()
    task = nil
}
```

## 4) Типовые баги из-за reuse
- “мерцающие/не те картинки”:
  - async image load пришёл после reuse и поставил картинку “не в ту строку”.
Фиксы:
  - cancel task в prepareForReuse,
  - проверка `indexPath`/id модели,
  - использование image cache.

- “сохраняется старый hidden/alpha/state”:
  - забыли выставить все свойства в `configure`.

- Auto Layout warnings/прыжки:
  - переиспользование constraints без правильной конфигурации, или динамические constraints добавляются каждый раз.

## 5) Prefetching и reuse
Prefetching может заранее инициировать загрузку данных/картинок:
- но ячейка всё равно будет переиспользована, поэтому важно связывать результат загрузки с моделью/id, а не с “текущей ячейкой”.

**Самопроверка**
- Оспорено: “reuse означает, что cell живёт только для одного indexPath” — нет, cell может быть использована для десятков разных indexPath.
- Неочевидно: `prepareForReuse` — не всегда единственное место сброса; лучший подход — сделать `configure` идемпотентным (полностью выставляет state).
- Источники: Apple docs UITableView/UITableViewCell, best practices reuse и async image loading, prefetching patterns.

### Q95 (🟠): Что такое `estimatedRowHeight`?

**Кратко**
- `estimatedRowHeight` — "предполагаемая" высота строки, которую `UITableView` использует до того, как реально измерит self-sizing ячейки.
- Нужна, чтобы table view могла:
  - рассчитать `contentSize` заранее,
  - быстро отрисовать первые экраны,
  - избежать тяжелых измерений для всех ячеек сразу.
- Начиная с iOS 11, если не задать явно, значение по умолчанию — `UITableView.automaticDimension`, и система оценивает высоту автоматически. До iOS 11 дефолт был 0, что отключало estimation полностью.
- Плохие оценки дают:
  - скачки скролла (jumping),
  - лишние layout passes,
  - подёргивания при прокрутке.

**Развёрнуто**
## 1) Контекст: self-sizing cells
Если ты используешь динамическую высоту:
```swift
tableView.rowHeight = UITableView.automaticDimension
```
таблица должна вычислять высоту через Auto Layout.
Но она не может заранее измерить тысячи ячеек — это дорого.

Поэтому она использует "estimate".

## 2) Что делает `estimatedRowHeight`
- До реального измерения table view считает каждую строку примерно равной `estimatedRowHeight`.
- Это позволяет быстро вычислить примерный `contentSize` и отображать интерфейс без ожидания измерений.
- По мере того как ячейки появляются/измеряются, таблица уточняет высоты и корректирует layout.

## 3) Значение по умолчанию
- **iOS 11+**: если не задать явно, `estimatedRowHeight = UITableView.automaticDimension` (-1) — система оценивает высоту автоматически на основе первых ячеек.
- **До iOS 11**: дефолт был `0`, что **отключало** estimation — таблица измеряла все ячейки сразу, что могло быть очень дорого на больших списках.

## 4) Как задавать
- Можно задать одно значение:
```swift
tableView.estimatedRowHeight = 80
```
- Или реализовать делегат:
```swift
func tableView(_ tableView: UITableView, estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat
```
(если хочешь разные estimates для разных типов строк).

## 5) Почему от качества оценки зависит плавность
Если estimate далёк от реальности:
- таблица сильно ошибётся в `contentSize`,
- при уточнении высот будет "перескакивать" позиция контента,
- появятся дополнительные пересчёты layout на скролле.

Хорошая эвристика:
- ставь estimate близкий к медианной реальной высоте твоих ячеек.
- если есть несколько типов ячеек с разными высотами — делай разные estimates.

## 6) Взаимодействие с `estimatedSectionHeaderHeight/estimatedSectionFooterHeight`
Аналогично для header/footer:
- неверные оценки там тоже дают скачки.

## 7) Типовые проблемы и фиксы
- Лаги при первом показе списка:
  - слишком маленький estimate или 0 → таблица начинает измерять много.
- "jumping content":
  - estimate сильно отличается.
- Сложные self-sizing ячейки:
  - оптимизируй constraints (не добавляй/не пересоздавай на лету),
  - избегай дорогих layout в `layoutSubviews`,
  - кэшируй высоты, если контент статичен.

**Самопроверка**
- Оспорено: "estimatedRowHeight — это просто косметика" — нет, это важная оптимизация, влияющая на расчёт contentSize и количество измерений.
- Неочевидно: до iOS 11 дефолт был 0 и estimation было отключено; на iOS 11+ система оценивает сама, но явное значение близкое к реальности всегда лучше.
- Источники: Apple docs UITableView self-sizing, статьи/WWDC про performance таблиц, практики подбора estimated heights.

### Q96 (🟠): Что такое self-sizing cells?

**Кратко**
- Self-sizing cells — ячейки `UITableView`/`UICollectionView`, которые вычисляют свою высоту/размер **автоматически** на основе Auto Layout (intrinsic size + constraints).
- В `UITableView` обычно включается через:
  - `tableView.rowHeight = UITableView.automaticDimension`
  - и адекватный `estimatedRowHeight`.
- В `UICollectionView`:
  - self-sizing зависит от layout (Flow/Compositional) и `preferredLayoutAttributesFitting(...)`.

**Развёрнуто**
## 1) Как это работает в `UITableView`
Таблица запрашивает у ячейки “какой размер тебе нужен”, и Auto Layout считает высоту, исходя из:
- constraints внутри `contentView`,
- intrinsic content sizes (label/button),
- ограничений по ширине (обычно leading/trailing к contentView).

Критически важно:
- вертикальная цепочка constraints должна быть полной:
  - top → ... → bottom,
  - иначе высота ambiguous.

Типичный набор:
- все subviews привязаны к `contentView`,
- есть bottom constraint от последнего элемента.

## 2) Настройка
```swift
tableView.rowHeight = UITableView.automaticDimension
tableView.estimatedRowHeight = 80
```

## 3) Частые требования к constraints
- Не должно быть “двойных” вертикальных высот:
  - например, фиксированная высота + контент, который требует больше.
- Для `UILabel`:
  - `numberOfLines = 0` для многострочного,
  - ширина должна быть определена (leading/trailing), иначе высота может считаться неверно.

## 4) Почему self-sizing может лагать
- Каждое измерение — это Auto Layout pass, иногда несколько.
В списке из сотен элементов:
- много измерений → CPU нагрузка.
Ситуация ухудшается, если:
- constraints сложные,
- в ячейке много вложенных stackView,
- ты пересоздаёшь constraints в `layoutSubviews`,
- используешь `layoutIfNeeded` на скролле.

## 5) Self-sizing в `UICollectionView`
Зависит от layout:
- Flow layout: self-sizing работает через estimatedItemSize и fitting.
- Compositional layout: чаще задают size через layout sizes; но можно включать estimated dimension.

Ключевые места:
- `preferredLayoutAttributesFitting(_:)` в ячейке (если надо кастомизировать),
- корректные constraints внутри contentView.

## 6) Практические советы
- Старайся держать constraints простыми.
- Кэшируй высоты, если контент статичен (особенно в table).
- Давай хороший `estimatedRowHeight`/estimated sizes.
- Избегай дорогих вычислений в `layoutSubviews`.

**Самопроверка**
- Оспорено: “self-sizing всегда бесплатно” — нет, это Auto Layout измерения; при плохих constraints и большом списке может стать bottleneck.
- Неочевидно: главная причина “не работает self-sizing” — неполная вертикальная constraint-цепочка (нет bottom) или неопределённая ширина для многострочного текста.
- Источники: Apple docs UITableView/UICollectionView self-sizing, WWDC про performance списков, примеры fitting для collection view.

### Q97 (🟠): Как работает `UICollectionView` layout?

**Кратко**
- Layout в `UICollectionView` — объект (`UICollectionViewLayout`), который рассчитывает:
  - `layoutAttributes` (frame, transform, zIndex) для элементов,
  - размер контента (`collectionViewContentSize`),
  - и реагирует на инвалидации (изменение bounds/данных).
- `UICollectionView` при необходимости спрашивает layout:
  - какие элементы видимы в rect,
  - где они должны быть,
  - и применяет атрибуты к ячейкам/декорациям/supplementary views.

**Развёрнуто**
## 1) Кто за что отвечает
- `UICollectionView`:
  - реюзит ячейки,
  - управляет selection, updates, scrolling,
  - запрашивает layoutAttributes и применяет их.
- `UICollectionViewLayout` (или subclass):
  - решает геометрию и анимации вставок/удалений через layout attributes.
- `UICollectionViewLayoutAttributes`:
  - “паспорт” элемента: frame, alpha, transform, zIndex, etc.

## 2) Типичный жизненный цикл layout
### A) `prepare()`
Layout подготавливает кеши/расчёты.

### B) `layoutAttributesForElements(in:)`
Collection view спрашивает атрибуты для видимой области (и чуть больше).
Layout возвращает массив attributes.

### C) `layoutAttributesForItem(at:)`
Атрибуты для конкретной ячейки.

### D) `collectionViewContentSize`
Размер скроллируемого контента.

### E) Инвалидация
При изменениях:
- bounds (поворот/resize),
- данных (insert/delete),
- environment (traits),
collection view просит layout “пересчитать”:
- через `invalidateLayout()`,
- или `shouldInvalidateLayout(forBoundsChange:)`.

## 3) Flow Layout (самый распространённый)
`UICollectionViewFlowLayout` даёт:
- сетку (rows/columns),
- scroll direction,
- inter-item spacing, line spacing,
- section insets, headers/footers.

Он достаточно быстрый и покрывает большинство кейсов.

## 4) Self-sizing в collection view
Collection view может просить у ячейки “fitting size”:
- это может вызывать Auto Layout измерения,
- поэтому важно давать estimated sizes и избегать сложных constraints.

## 5) Про layout attributes и анимации updates
Когда ты делаешь insert/delete/move:
- layout участвует в анимациях:
  - initial/final attributes,
  - invalidation contexts,
  - batch updates.

Сложные кастомные анимации часто реализуют в кастомном layout.

## 6) Практические советы
- Кэшируй вычисления в layout, если они дорогие.
- Минимизируй invalidations:
  - `shouldInvalidateLayout(forBoundsChange:)` возвращай true только когда нужно.
- В compositional layout с “estimated” размерами — следи за количеством перерасчётов.

**Самопроверка**
- Оспорено: “layout = это просто расставить frames один раз” — layout постоянно отвечает на запросы attributes и может инвалидироваться при скролле/изменениях.
- Неочевидно: производительность часто упирается не в reuse, а в частые invalidations/перерасчёт attributes (особенно с self-sizing/estimated).
- Источники: Apple docs UICollectionViewLayout/FlowLayout, WWDC про collection view layouts, best practices caching/invalidation.

### Q98 (🟠): Чем отличается flow layout от compositional layout?

**Кратко**
- `UICollectionViewFlowLayout` — классическая “поточная” раскладка: строки/колонки, секции, spacing, headers/footers. Простая и быстрая для сеток и списков.
- Compositional Layout (`UICollectionViewCompositionalLayout`) — декларативный API для построения сложных секций через:
  - items → groups → sections,
  - ортогональный скролл, вложенные группы, разные layout’ы по секциям,
  - supplementary/decoration views.
- Flow — проще и легче, Compositional — мощнее для сложных макетов.

**Развёрнуто**
## 1) Модель мышления
### Flow layout
Ты думаешь “как grid”:
- itemSize,
- минимальные отступы,
- перенос строк,
- section insets.
Пример: карточки 2×N, список, простая галерея.

### Compositional
Ты думаешь “как дизайн-сетка”:
- item внутри group,
- group внутри section,
- секции могут иметь разные конфигурации.
Можно описать почти любой Pinterest/Store/App Store стиль.

## 2) Возможности
### Flow layout умеет хорошо
- равномерные сетки,
- простые headers/footers,
- basic self-sizing (через estimatedItemSize),
- относительно небольшая сложность.

### Compositional умеет лучше
- разные размеры item’ов в одной секции,
- nested groups,
- orthogonal scrolling (горизонтальный карусельный скролл внутри вертикального списка),
- per-section layout (каждая секция уникальна),
- decoration views (фон секции),
- гибкие fractional/absolute/estimated размеры.

## 3) Производительность
- Flow layout обычно быстрее и проще предсказуем.
- Compositional может быть очень эффективным, но:
  - “estimated” размеры могут вызвать дополнительные измерения и invalidations,
  - сложные иерархии групп могут увеличить стоимость расчётов.
Оба варианта могут быть “быстрыми или медленными” в зависимости от self-sizing, количества элементов и invalidation паттернов.

## 4) Когда что выбирать
### Flow layout
- список/сетка без сложных комбинаций,
- нужен минимальный overhead,
- legacy код или простая поддержка.

### Compositional
- сложные экраны (много разных секций),
- нужна карусель внутри списка,
- нужен фон/декорации секции,
- быстро и декларативно собрать макет, близкий к дизайну.

## 5) Взаимодействие с diffable
Compositional особенно хорошо сочетается с diffable data source:
- данные меняются снапшотами,
- layout описывается секциями,
получается “современный” UICollectionView stack.

**Самопроверка**
- Оспорено: “compositional всегда медленнее” — не всегда; он может быть очень эффективным, но требует дисциплины с estimated/self-sizing.
- Неочевидно: при выборе важнее не “что новее”, а сложность макета и требования к обновлениям; простой grid на flow часто проще и надёжнее.
- Источники: Apple docs UICollectionViewCompositionalLayout, WWDC про compositional layouts и orthogonal scrolling, performance notes по estimated sizes.

### Q99 (🟠): Что такое diffable data source?

**Кратко**
- Diffable Data Source — API (`UITableViewDiffableDataSource` / `UICollectionViewDiffableDataSource`), где ты обновляешь UI не “ручными insert/delete”, а применяешь **snapshot состояния данных**.
- Система сама считает diff между старым и новым snapshot и выполняет безопасные animated updates.
- Требует, чтобы идентификаторы секций/элементов были `Hashable` и **стабильными** (identity).

**Развёрнуто**
## 1) Идея: UI как проекция состояния
Ты описываешь “что должно быть на экране”:
- какие секции,
- какие элементы в каждой секции,
в виде snapshot.
Потом:
```swift
dataSource.apply(snapshot, animatingDifferences: true)
```
UIKit:
- сравнивает предыдущий snapshot и новый,
- строит операции insert/delete/move/reload,
- выполняет их корректно и анимированно.

## 2) Чем лучше классического подхода
В классике ты сам делал:
- `beginUpdates/endUpdates`,
- `insertRows/deleteRows`,
- следил за согласованностью indexPath и модели.
Это легко ломается (“Invalid update: invalid number of rows”).

Diffable:
- делает вычисление diff и порядок обновлений за тебя,
- снижает количество крэшей при апдейтах.

## 3) Identity vs content
Важно различать:
- identity (кто элемент) — `Hashable` id, должен быть стабильным,
- content (что внутри) — может меняться.

Если identity меняется при каждом обновлении:
- система думает, что это новый элемент → будет delete/insert вместо reload.

Поэтому часто используют:
- `struct Item: Hashable { let id: UUID; var title: String }`
и `hash(into:)` базируют на `id`.

## 4) Reload и performance
- В snapshot есть методы `reloadItems`, `reloadSections`.
- Но часто можно просто изменить модель и применить snapshot заново — diffable решит, что делать.
При больших данных:
- “полный rebuild snapshot” может быть дорогим — иногда применяют incremental snapshots.

## 5) С чем обычно используют
- Современные `UICollectionView` экраны:
  - diffable + compositional layout.
- Prefetching и фоновые обновления:
  - snapshot строят в background, apply — на main.

## 6) Типовые ошибки
- Нестабильные Hashable (например, включили title в hash) → “прыгающие” элементы и неправильные анимации.
- Пытаться одновременно управлять UI вручную (batchUpdates/insertRows) и diffable — конфликт моделей обновления.
- Не учитывать, что apply асинхронно относительно animation: иногда нужен completion.

**Самопроверка**
- Оспорено: “diffable — это просто удобнее писать” — он решает класс проблем согласованности обновлений и делает diff безопаснее.
- Неочевидно: главное условие корректности — стабильная identity; ошибки в Hashable дают “мистические” апдейты.
- Источники: Apple docs Diffable Data Source, WWDC про modern collection views, best practices identity/content separation.

### Q100 (🟠): Как работает `batchUpdates`?

**Кратко**
- `performBatchUpdates` (в `UICollectionView`) и `beginUpdates/endUpdates` (в `UITableView`) — способ применить **группу изменений** (insert/delete/move/reload) как одну транзакцию с консистентной анимацией.
- Внутри batch Updates ты должен:
  - синхронно обновить источник данных (модель),
  - и выполнить соответствующие операции обновления UI (insert/delete/move).
- Неправильное соответствие модель ↔ операции приводит к крэшам “Invalid update…”.

**Развёрнуто**
## 1) Зачем нужен batching
Если ты делаешь несколько операций по отдельности:
- анимации могут быть несогласованными,
- промежуточные состояния могут быть неконсистентны,
- есть риск рассинхрона индексов.

Batch updates:
- группирует изменения,
- применяет их вместе,
- анимирует как единый переход.

## 2) `UICollectionView.performBatchUpdates`
```swift
collectionView.performBatchUpdates({
    data.remove(at: 0)
    collectionView.deleteItems(at: [IndexPath(item: 0, section: 0)])

    data.insert(new, at: 2)
    collectionView.insertItems(at: [IndexPath(item: 2, section: 0)])
}, completion: { finished in
    // ...
})
```

Ключевые правила:
- обновление модели и вызовы insert/delete должны соответствовать друг другу,
- индексPath должны быть валидны относительно “до/после” состояния (это тонкий момент, поэтому лучше делать простые шаги или использовать diffable).

## 3) `UITableView` аналог
- `tableView.beginUpdates()` / `endUpdates()`
- `insertRows`, `deleteRows`, `reloadRows`, `moveRow`.
(Есть и `performBatchUpdates` в некоторых версиях, но классический паттерн — begin/end.)

## 4) Что происходит внутри (концептуально)
- UIKit берёт “до” и “после” состояния (на основе твоих операций),
- валидирует, что изменения согласованы,
- строит анимации и обновляет layout.
Если validation не проходит — крэш, потому что иначе таблица/коллекция может уйти в неконсистентное состояние.

## 5) Где чаще всего ломаются
- меняют модель **после** вызова delete/insert,
- делают несколько операций с конфликтующими indexPath,
- делают reload + delete на одни и те же элементы,
- пытаются делать updates, пока идёт другая анимация обновления.

## 6) Связь с diffable
Diffable data source по сути делает “батчинг” за тебя:
- считает diff,
- применяет корректный набор операций.
Поэтому для сложных обновлений diffable часто надёжнее.

**Самопроверка**
- Оспорено: “batchUpdates — это просто для красивой анимации” — это ещё и механизм консистентности; без него легко сломать модель обновлений.
- Неочевидно: главный инвариант — модель и операции должны описывать одно и то же изменение; иначе `Invalid update` неизбежен.
- Источники: Apple docs UICollectionView batch updates, UITableView updates, WWDC про modern collection view updates и diffable.

### Q101 (🟠): Что такое prefetching?

**Кратко**
- Prefetching — механизм, который позволяет заранее подготавливать данные для элементов списка/коллекции, которые **скоро появятся на экране**.
- В iOS:
  - `UITableViewDataSourcePrefetching`
  - `UICollectionViewDataSourcePrefetching`
- Используется для:
  - загрузки изображений,
  - подгрузки страниц данных,
  - подготовки тяжелых вычислений до появления ячейки.
- Важно: prefetching даёт “подсказку”, но не гарантию; нужно уметь отменять работу.

**Развёрнуто**
## 1) Как это работает
UIKit анализирует направление/скорость скролла и прогнозирует, какие indexPath будут нужны скоро.
Затем вызывает:
- `prefetchRowsAt` / `prefetchItemsAt`.

Когда прогноз меняется (пользователь резко скроллит назад), UIKit вызывает:
- `cancelPrefetchingForRowsAt` / `cancelPrefetchingForItemsAt`.

## 2) Типичный use case: изображения
```swift
func tableView(_ tableView: UITableView, prefetchRowsAt indexPaths: [IndexPath]) {
    let urls = indexPaths.map { models[$0.row].imageURL }
    imageLoader.prefetch(urls)
}

func tableView(_ tableView: UITableView, cancelPrefetchingForRowsAt indexPaths: [IndexPath]) {
    let urls = indexPaths.map { models[$0.row].imageURL }
    imageLoader.cancelPrefetch(urls)
}
```

Критично:
- связывать работу с **идентификатором модели**, а не с конкретной ячейкой, потому что ячейки re-use’ятся.

## 3) Prefetching vs cell creation
Prefetching не означает, что ячейка уже создана.
Это сигнал:
- “вот эти данные пригодятся”.
Фактическое создание и конфигурация ячейки произойдёт позже.

## 4) Отмена — обязательна
Если не отменять:
- можно тратить сеть/CPU на элементы, которые пользователь не увидит,
- можно раздувать очередь запросов,
- можно перегреть устройство/посадить батарею.

## 5) Prefetching и pagination
Prefetching удобно использовать, чтобы заранее запрашивать следующую страницу данных:
- когда видимые строки приближаются к концу.
Но осторожно:
- не триггерить загрузку многократно,
- держать состояние “loading”.

## 6) Когда prefetching не помогает
- Если загрузка очень быстрая или всё кэшировано — эффект минимальный.
- Если задача слишком тяжёлая и всё равно не успевает — нужно менять архитектуру (кэш, формат данных, меньшие картинки).

**Самопроверка**
- Оспорено: “prefetching гарантирует, что элемент будет показан” — нет, это лишь прогноз; поэтому cancel важен.
- Неочевидно: prefetching легко сделать хуже (лишняя работа) при отсутствии отмены/дедупликации запросов.
- Источники: Apple docs UITableView/UICollectionView prefetching, best practices image prefetch + cancel, performance guides for scrolling.

### Q102 (🟠): Что такое snapshotting (diffable)?

**Кратко**
- Snapshot — это “снимок” состояния данных для diffable data source: список секций и элементов в каждой секции в конкретный момент.
- Ты создаёшь/меняешь snapshot и применяешь:
  - `dataSource.apply(snapshot, animatingDifferences: true)`
- UIKit сравнивает старый snapshot с новым и автоматически выполняет корректные insert/delete/move/reload анимации.
- Snapshotting — это подход “описать состояние”, а не “ручные операции”.

**Развёрнуто**
## 1) Что такое `NSDiffableDataSourceSnapshot`
Это структура (generic по типу секции и item):
- хранит порядок секций,
- хранит порядок item’ов внутри секций,
- позволяет добавлять/удалять/перемещать элементы.

Пример:
```swift
var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
snapshot.appendSections([.main])
snapshot.appendItems(items, toSection: .main)
dataSource.apply(snapshot, animatingDifferences: true)
```

## 2) Почему snapshot — не “модель данных”
Snapshot — это representation для UI, а не единственный источник истины.
Частый правильный паттерн:
- модель хранится отдельно (ViewModel/Store),
- snapshot строится из модели при изменениях.

## 3) Identity — ключ к корректности
Diffable основывается на identity элементов (Hashable).
Если identity нестабильна:
- diffable будет считать элементы “новыми” и перерисовывать/перемещать странно.
Поэтому:
- hash/== должны опираться на стабильный `id`, а не на изменяемые поля.

## 4) Reload в snapshot
Есть методы:
- `snapshot.reloadItems(...)`
- `snapshot.reloadSections(...)`
Но:
- reload имеет смысл, когда identity та же, но контент изменился и нужно обновить cell configuration.
Также есть “reconfigure” API (в некоторых версиях iOS) для более лёгкого обновления без полного reload (концептуально: обновить конфигурацию без пересоздания/анимации как insert/delete).

## 5) Полный snapshot vs incremental
- Полный rebuild snapshot:
  - проще и часто достаточно.
- Incremental:
  - полезно для очень больших списков, когда стоимость пересборки заметна.

## 6) Типовые ошибки
- Хранить snapshot как “единственную модель” → сложно синхронизировать бизнес-логику.
- Параллельно делать `performBatchUpdates` и apply snapshot → конфликт.
- Делать apply слишком часто (например, на каждый символ поиска без дебаунса) → лишние diff и лаги.

**Самопроверка**
- Оспорено: “snapshotting — это просто новый способ вызвать insert/delete” — нет, это смена парадигмы на state-driven обновления.
- Неочевидно: snapshot не должен заменять модель данных; иначе ты теряешь разделение ответственности и усложняешь логику.
- Источники: Apple docs Diffable Data Source + Snapshot, WWDC “Modern Collection Views”, best practices identity/reload/reconfigure.

### Q103 (🟠): Как работает hit-testing?

**Кратко**
- Hit-testing — процесс поиска вью, которая должна получить touch-событие.
- UIKit начинает с окна (UIWindow) и рекурсивно обходит иерархию:
  1) проверяет `isUserInteractionEnabled`, `isHidden`, `alpha`,
  2) проверяет `point(inside:with:)`,
  3) идёт по subviews **сверху вниз по z-order** (с конца массива subviews),
  4) возвращает самую “верхнюю” подходящую вью.
- Главные методы:
  - `hitTest(_:with:)`
  - `point(inside:with:)`

**Развёрнуто**
## 1) Алгоритм (упрощённо)
Когда пользователь касается экрана:
- система получает координату в окне,
- вызывает `window.hitTest(point, with: event)`.

`hitTest` в UIView по умолчанию делает:
1) если `isHidden == true` → nil
2) если `alpha < ~0.01` → nil
3) если `isUserInteractionEnabled == false` → nil
4) если `pointInside == false` → nil
5) иначе перебирает subviews в обратном порядке (последняя добавленная — “сверху”):
   - переводит point в координаты subview
   - спрашивает `subview.hitTest(...)`
6) если никто из subviews не подходит → возвращает self.

## 2) `point(inside:with:)` — расширение/сужение tappable area
Частый кейс: маленькая кнопка.
Ты можешь увеличить область тапа, не меняя визуальный размер:
```swift
override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    bounds.insetBy(dx: -10, dy: -10).contains(point)
}
```

## 3) `hitTest(_:with:)` — прокидывание тапа “сквозь” слой
Например, overlay, который должен пропускать тапы на контент:
```swift
override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    let view = super.hitTest(point, with: event)
    return view == self ? nil : view
}
```

## 4) Важные нюансы
- Hit-testing работает в координатах, учитывая transforms.
- `clipsToBounds` не влияет на hit-testing напрямую (он влияет на рисование), но `pointInside` использует bounds (которые уже после transform).
- События могут попадать в views, которые не видны на 100% (если alpha > порога и не hidden).

## 5) Связь с gesture recognizers
После того как target view найден:
- начинается обработка через responder chain и gesture recognizers.
Но hit-testing определяет “кандидата”, вокруг которого система строит доставку событий.

**Самопроверка**
- Оспорено: “touch идёт в первую подходящую subview” — он идёт в верхнюю по z-order (последнюю добавленную), поэтому порядок subviews важен.
- Неочевидно: `point(inside:)` — самый безопасный способ менять hit-area; `hitTest` — более мощный, но легко сломать поведение (например, скролл).
- Источники: UIKit docs UIView hit-testing, event delivery, практики overlay/pass-through.


### Q104 (🟠): Как работает responder chain?

**Кратко**
- Responder chain — цепочка объектов `UIResponder`, по которой UIKit “подымает” события, если текущий объект их не обработал.
- Для touch/gesture это обычно:
  - сначала hit-testing выбирает target view,
  - затем события идут через responder chain.
- Типичная цепочка:
  - UIView → UIViewController → (контейнеры) → UIWindow → UIApplication → AppDelegate/SceneDelegate (в зависимости от iOS).
- Также responder chain используется для:
  - `target-action` (UIButton и др.),
  - обработки motion/remote events,
  - поиска “первого респондера” для клавиатуры.

**Развёрнуто**
## 1) Кто такие responders
`UIResponder` — базовый класс для объектов, которые могут обрабатывать события:
- `UIView`
- `UIViewController`
- `UIWindow`
- `UIApplication`

Каждый responder имеет:
- `next` (следующий в цепочке).

## 2) Как строится цепочка
Для `UIView`:
- `next` обычно → её `UIViewController` (если есть),
- иначе → superview.

Для `UIViewController`:
- `next` обычно → parent VC или `UIWindow`.

Для `UIWindow`:
- `next` → `UIApplication`.

## 3) Как события проходят
Если view не обработала событие:
- UIKit передаёт его следующему responder’у (`next`), и так далее.
Если никто не обработал — событие “теряется” (для конкретного типа события поведение может отличаться).

Пример для touch:
- `touchesBegan/Moved/Ended/Cancelled`.

## 4) Target-Action и responder chain
Когда ты используешь `UIControl` (UIButton):
- система ищет target:
  - если target задан явно — отправляет туда,
  - если target = nil — UIKit идёт по responder chain вверх и ищет объект, который реализует action.
Это причина, почему можно писать:
- `@IBAction func didTap(_ sender: UIButton)` в VC без явного target.

## 5) First Responder (клавиатура)
- `becomeFirstResponder()` делает объект “первым респондентом”.
- События клавиатуры идут в first responder (обычно `UITextField/UITextView`).
- Чтобы найти текущий first responder, часто обходят responder chain/иерархию (официального “getCurrentFirstResponder” нет).

## 6) Типовые баги
- Неправильный hit-testing/overlays ломают выбор initial responder, и события “не доходят”.
- Кастомные контейнеры VC при неправильном containment ломают responder chain.
- Смешивание gesture recognizers и controls: gesture может перехватывать тапы и не давать control’ам получить action.

**Самопроверка**
- Оспорено: “responder chain = hit-testing” — hit-testing выбирает стартовую view, а responder chain определяет, куда событие пойдёт дальше, если не обработано.
- Неочевидно: target-action с target=nil — реально использует responder chain; это часто спрашивают и мало кто объясняет уверенно.
- Источники: UIKit docs Event Handling Guide, UIResponder/next, UIControl target-action, first responder и keyboard pipeline.

### Q105 (🟠): Чем отличается `frame` / `bounds`?

**Кратко**
- `bounds` — прямоугольник **в собственной системе координат** вью (обычно origin = (0,0)), описывает её внутреннюю область.
- `frame` — прямоугольник **в системе координат superview**, описывает положение и размер вью снаружи.
- Трансформации (`transform`) напрямую влияют на `frame` (он становится “обрамляющим” прямоугольником), а `bounds` — чаще остаётся базой для внутреннего рисования/лейаута.

**Развёрнуто**
## 1) Системы координат
- `frame`: где эта вью находится относительно родителя.
- `bounds`: какая у неё внутренняя область, где она рисует и раскладывает subviews.

Обычно:
- `bounds.origin = .zero`,
- `bounds.size` примерно равен size в `frame` (если нет transform).

## 2) Зачем нужен `bounds.origin`
`bounds.origin` можно менять, чтобы:
- “сдвинуть” внутреннюю систему координат.
Это используется в скролле/кастомных контейнерах:
- `UIScrollView` меняет bounds.origin, чтобы создавать эффект прокрутки.

Если ты в кастомной вью сместишь bounds.origin:
- subviews и `draw(_:)` будут “сдвинуты” относительно видимой области.

## 3) Как transform влияет
Если применить:
```swift
view.transform = CGAffineTransform(rotationAngle: .pi/4)
```
- `bounds` остаётся размером “внутренней коробки”,
- `frame` становится axis-aligned bounding box повернутой вью (и может увеличиться).

Поэтому после transform `frame` может быть “не тем, что ожидаешь”.

## 4) Практические кейсы
- В `layoutSubviews` обычно используют `bounds`:
  - потому что layout внутри своей вью удобнее в локальных координатах.
- Для позиционирования относительно родителя — `frame`.
- Для `shadowPath`, `cornerRadius`, `draw(_:)` — обычно опираются на `bounds`.

## 5) Типовые ошибки
- Менять `frame` у вью, которая управляется Auto Layout → изменения перезатираются.
  - Надо менять constraints.
- Удивляться “почему frame странный” после transform — это normal, потому что frame = bounding box.

**Самопроверка**
- Оспорено: “frame и bounds — одно и то же” — нет, это разные системы координат: внешняя (родителя) и внутренняя (самой вью).
- Неочевидно: bounds.origin — скрытая суперсила (как у scroll view), и из-за неё могут происходить “магические” смещения контента.
- Источники: UIKit docs UIView geometry, coordinate systems, UIScrollView implementation concepts, влияние transforms на frame.

### Q106 (🟠): Как работает трансформация (`CGAffineTransform`)?

**Кратко**
- `CGAffineTransform` — 2D аффинная матрица (математически 3×3 в гомогенных координатах, но структура хранит только 6 элементов: `a, b, c, d, tx, ty`), которая описывает:
  - перенос (translation),
  - масштаб (scale),
  - поворот (rotation),
  - сдвиг (shear).
- В UIKit она применяется к `UIView.transform` (и layer `affineTransform`) и влияет на:
  - визуальное отображение,
  - hit-testing/координаты (через преобразование систем),
  - `frame` (как bounding box), но не на `bounds`.
- Трансформации **композируются** (умножаются), порядок операций важен.

**Развёрнуто**
## 1) Что значит "аффинная"
Она сохраняет прямые линии и параллельность (но не обязательно длины/углы).
Это покрывает большинство UI-эффектов: rotate/scale/move.

## 2) Структура матрицы
Математически аффинное преобразование описывается матрицей 3×3 в гомогенных координатах, однако третья строка всегда фиксирована (0, 0, 1) и не хранится. Поэтому `CGAffineTransform` содержит только 6 значений: `a, b, c, d, tx, ty`.

## 3) Как применять в UIKit
```swift
view.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
view.transform = CGAffineTransform(rotationAngle: .pi/8)
view.transform = CGAffineTransform(translationX: 20, y: 0)
```

## 4) Композиция и порядок
Комбинировать можно через `concatenating` или цепочкой:
```swift
let t = CGAffineTransform.identity
    .translatedBy(x: 20, y: 0)
    .rotated(by: .pi/8)
    .scaledBy(x: 0.9, y: 0.9)
view.transform = t
```

Порядок важен:
- rotate потом translate ≠ translate потом rotate.
Именно это часто "ломает" ожидания.

## 5) Anchor point и layer transforms
`UIView.transform` применяется относительно layer `anchorPoint` (по умолчанию центр).
Если нужен поворот вокруг угла:
- можно менять `layer.anchorPoint`, но это сдвигает `position` и требует аккуратной коррекции.

## 6) Влияние на layout
- Auto Layout рассчитывает frames **до** применения transform.
- transform не меняет constraints, это чисто визуальная трансформация.
Следствие:
- если ты используешь transform для "изменения размера", Auto Layout всё равно считает размер прежним.
- поэтому transform подходит для анимаций, но не для "реального" layout.

## 7) Связь с hit-testing
UIKit преобразует точки между системами координат.
После transform:
- координаты "реальной области" вью меняются,
- hit-testing обычно учитывает transform, но `point(inside:)` работает в локальной системе координат после преобразований.

## 8) Типовые ошибки
- Считать, что `frame` после transform — "настоящий" layout: это bounding box.
- Смешивать constraints и transform для одного эффекта и получать неожиданные прыжки.
- Менять `anchorPoint` без компенсации `position` → вью "прыгает".

**Самопроверка**
- Оспорено: "transform меняет bounds/constraints" — нет, это визуальное преобразование; Auto Layout его не учитывает в расчёте.
- Неочевидно: порядок операций критичен; многие баги "почему не так крутится/двигается" — это неправильная композиция трансформов.
- Источники: Core Graphics docs (CGAffineTransform), UIKit transform behavior, Core Animation anchorPoint/position, практики анимаций.

### Q107 (🟠): Что такое constraints priorities?

**Кратко**
- Priority у constraint — число 1…1000, которое говорит Auto Layout, **насколько важно** выполнить это ограничение.
- `1000` = required (обязательный). Ограничения ниже 1000 могут быть “сломаны” (broken), если иначе система уравнений неразрешима.
- Приоритеты нужны, чтобы:
  - разрешать конфликты,
  - задавать “предпочтения” (например, “хочу 200, но могу меньше”),
  - моделировать гибкие интерфейсы.

**Развёрнуто**
## 1) Как Auto Layout использует priority
Auto Layout пытается:
1) удовлетворить все required constraints,
2) затем максимально удовлетворить ограничения по убыванию priority.

Если два constraints конфликтуют:
- победит более высокий priority,
- более низкий может быть нарушен.

Это видно в логах как “Unable to simultaneously satisfy constraints” и “Will attempt to recover by breaking constraint …”.

## 2) Практический пример: “хочу высоту 200, но не больше 120”
Задаём:
- preferred height = 200 с priority 750,
- max height <= 120 с priority 1000.

В итоге:
- если есть место, может быть 120 (потому что max required),
- если нет — ещё меньше, но приоритет 750 “хочу 200” будет уступать.

## 3) Приоритеты vs Hugging/Compression
Hugging/Compression — это тоже приоритеты, но для “неявных” constraints вокруг intrinsic size.
Явные constraints с higher priority обычно сильнее влияют.

## 4) Где ещё есть priorities
- `UILayoutPriority` для constraints.
- `contentHuggingPriority` / `contentCompressionResistancePriority`.
- В `UIStackView` распределение тоже взаимодействует с priorities.

## 5) Типовые значения
- 1000: required.
- 999: “почти required” (часто используют, чтобы избежать конфликтов с системными constraints).
- 750: defaultHigh.
- 250: defaultLow.

Но важно не заучивание, а понимание: priority = степень важности.

## 6) Типовые баги
- Все constraints required → при изменении контента/локализации система не может решить и “ломает” что-то случайно.
- Низкие priorities на критичных constraints → layout “разваливается”.
- Несогласованность: сделали height required и одновременно top/bottom required в контейнере с недостаточной высотой → конфликт.

**Самопроверка**
- Оспорено: “приоритет — это просто для красоты” — нет, это основной инструмент сделать систему уравнений решаемой и управляемой.
- Неочевидно: priority не “условие if”, а оптимизация: система ищет решение, максимизирующее удовлетворение ограничений по важности.
- Источники: Apple Auto Layout Guide, docs NSLayoutConstraint priority, материалы по debugging constraints и hugging/compression.

### Q108 (🟠): Что такое `layoutMargins` и `readableContentGuide`?

**Кратко**
- `layoutMargins` — внутренние отступы вью, которые описывают “комфортную” область для размещения контента. Их можно использовать вместо ручных констант.
- `layoutMarginsGuide` — layout guide, соответствующий этим отступам.
- `readableContentGuide` — layout guide, который ограничивает ширину контента до “читабельной” (особенно актуально на iPad/широких экранах), чтобы текстовые блоки не растягивались слишком широко.

**Развёрнуто**
## 1) `layoutMargins`
Это `UIEdgeInsets` у каждого `UIView`.
Использование:
- вместо `leading = 16` ты можешь привязывать к `layoutMarginsGuide.leadingAnchor` и тогда при изменении margin’ов весь контент подстроится.

Пример:
```swift
label.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor)
label.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor)
```

Плюсы:
- единообразные отступы по всему экрану,
- проще поддерживать адаптацию (разные устройства/ориентации),
- удобно в переиспользуемых компонентах.

Есть ещё:
- `preservesSuperviewLayoutMargins` — наследовать margin’ы от супервью.
- `directionalLayoutMargins` — учитывает RTL (leading/trailing).

## 2) `readableContentGuide`
Основная идея:
- на широких экранах (iPad, landscape) строки текста становятся слишком длинными → ухудшается читабельность.
`readableContentGuide` задаёт центральную область, в которой текст обычно читается комфортно.

Пример:
```swift
textView.leadingAnchor.constraint(equalTo: view.readableContentGuide.leadingAnchor)
textView.trailingAnchor.constraint(equalTo: view.readableContentGuide.trailingAnchor)
```

Это позволяет:
- на iPhone занимать почти всю ширину (с margins),
- на iPad автоматически сужать текстовый блок к “колонке”.

## 3) Разница в назначении
- `layoutMargins` — эстетические/дизайнерские отступы “по краям”.
- `readableContentGuide` — типографика/читабельность для длинных текстов.

Их можно комбинировать:
- общий контент в margins,
- длинный текст — в readable guide.

## 4) Типичные ошибки
- Жёстко ставить 16/20/24 везде без привязки к margins → сложнее адаптация.
- Игнорировать readable guide на iPad и получить “газетную простыню” текста.
- Путать safe area и margins:
  - safe area — про системные области,
  - margins/readable — про комфорт размещения внутри безопасной области.

**Самопроверка**
- Оспорено: “margins — это то же, что safe area” — нет: safe area защищает от системных перекрытий, margins — про внутреннюю композицию.
- Неочевидно: readableContentGuide особенно ценен для text-heavy экранов; для карточек/гридов он может быть неуместен.
- Источники: UIKit docs layoutMargins/layoutMarginsGuide/readableContentGuide, Apple HIG про читабельность и ширину текста.

### Q109 (🟠): Как устроен layout pipeline в UIKit: `setNeedsLayout`/`layoutIfNeeded`, Auto Layout pass, когда что вызывается?

**Кратко**
- В UIKit layout — это “отложенный” процесс:
  1) что-то меняется (bounds/constraints/контент),
  2) вью помечается как needing updateConstraints/layout,
  3) в ближайший цикл система:
     - обновляет constraints (`updateConstraints`),
     - решает Auto Layout,
     - применяет frames и вызывает `layoutSubviews`,
  4) затем при необходимости идёт display pass (`setNeedsDisplay` → `draw`),
  5) в конце run loop — commit Core Animation транзакций.
- `setNeedsLayout` — отложить layout, `layoutIfNeeded` — выполнить сейчас (если “грязно”).

**Развёрнуто**
## 1) Основные “флаги” и что они означают
### Constraints stage
- `setNeedsUpdateConstraints()`:
  - говорит: “мои constraints надо пересчитать”.
- `updateConstraints()`:
  - место, где вью создаёт/меняет constraints (константы/активации),
  - вызывается системой при необходимости.

### Layout stage
- `setNeedsLayout()`:
  - говорит: “пересчитать frames позже”.
- `layoutIfNeeded()`:
  - если что-то помечено как needing layout, выполняет layout прямо сейчас.

### Display stage
- `setNeedsDisplay()`:
  - говорит: “перерисовать пиксели позже”.
- `draw(_:)`:
  - рисование.

## 2) Типичный порядок в одном проходе
Упрощённо, когда что-то поменялось:
1) кто-то вызывает `setNeedsUpdateConstraints`/`setNeedsLayout` (или UIKit делает это сам),
2) система планирует layout pass на ближайшую итерацию run loop,
3) перед раскладкой:
   - вызывается `updateConstraints` у нужных вью,
4) Auto Layout solver считает frames,
5) UIKit применяет frames и вызывает:
   - `layoutSubviews` сверху вниз,
6) если есть needing display:
   - планируется/выполняется draw,
7) Core Animation commit (CATransaction) в конце run loop.

## 3) Что именно триггерит проход
- изменение constraints (активировали/деактивировали/изменили constant),
- изменение intrinsicContentSize (текст/шрифт/изображение),
- изменение bounds (rotation, resize),
- изменение safe area / trait collection,
- вызов `setNeeds*`.

## 4) Где чаще ошибаются
- Делают layout немедленно “в лоб”:
  - много `layoutIfNeeded()` в горячем цикле → лаги.
- Меняют constraints в `layoutSubviews` → recursion/дубли.
- Пытаются читать safeAreaInsets в `viewDidLoad` → часто 0.
- Смешивают frame-based layout и Auto Layout без понимания, кто победит.

## 5) Практика: анимация constraints
Правильный паттерн:
- поменяли constants,
- внутри animation block вызвали `layoutIfNeeded` на контейнере.

Плохой паттерн:
- менять frames вручную у Auto Layout views — система перетрёт.

**Самопроверка**
- Оспорено: “layout происходит сразу при изменении constraints” — нет, UIKit батчит изменения и делает проход позже; `layoutIfNeeded` — инструмент принудить, но его нужно дозировать.
- Неочевидно: `updateConstraints` и `layoutSubviews` — разные стадии; смешивание ответственности ведёт к рекурсивным layout passes и нестабильности.
- Источники: Apple Auto Layout lifecycle, UIKit docs `setNeedsLayout/layoutIfNeeded`, материалы о run loop + Core Animation commit.

### Q110 (🟠): Что такое offscreen rendering, почему он случается (cornerRadius+mask, shadows) и как его уменьшать?

**Кратко**
- Offscreen rendering — когда слой сначала рендерится **в отдельный буфер**, а потом композитится на экран, потому что эффект нельзя посчитать “на лету” при обычной композиции.
- Частые причины:
  - `cornerRadius` + `masksToBounds`/`clipsToBounds`,
  - тени (`shadow*`) без `shadowPath`,
  - маски (`layer.mask`), blur/visual effects, сложная альфа-композиция.
- Как уменьшать:
  - не использовать `masksToBounds` там, где можно,
  - выносить радиусы/клиппинг и тени в разные слои (container подход),
  - задавать `shadowPath`,
  - уменьшать площадь эффекта, упрощать иерархию,
  - иногда использовать rasterization, но только если контент статичен.

**Развёрнуто**
## 1) Почему cornerRadius + masksToBounds дорого
`cornerRadius` сам по себе — не всегда проблема.
Проблема, когда ты говоришь:
- “обрежь содержимое по скруглению” (`masksToBounds = true`).

Тогда рендереру нужно:
- сначала отрисовать содержимое слоя,
- затем применить маску скругления,
- и только потом скомпозитить.
Для списка из десятков карточек это быстро становится bottleneck.

### Практика: разделить слои
- Внешняя view для тени (без masksToBounds),
- Внутренняя view для клиппинга (masksToBounds = true) и контента.

Так ты избегаешь конфликта “тень + маска” и снижаешь тяжесть композиции.

## 2) Почему тени без shadowPath дорогие
Если у слоя есть:
- `shadowOpacity/Radius/Offset`,
но нет `shadowPath`, система может вычислять форму тени динамически, что дорого.

Фикс:
- задавать `shadowPath` на основе bounds (обычно в `layoutSubviews`):
```swift
override func layoutSubviews() {
    super.layoutSubviews()
    layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: 12).cgPath
}
```

## 3) Остальные причины
- `layer.mask` (любые маски),
- `UIVisualEffectView` (blur),
- group opacity и некоторые сочетания прозрачности,
- сложные фильтры/композитинг.

## 4) Как снижать стоимость системно
### A) Сократить количество и площадь
- уменьшить blur area,
- не делать радиусы на больших full-screen слоях,
- стараться, чтобы карточки были меньше по площади.

### B) Упростить иерархию
- меньше вложенных вью/слоёв,
- меньше одновременно активных эффектов.

### C) Кэшировать, но с умом
- `shouldRasterize` может помочь, если слой статичен,
- но если контент меняется — станет хуже (пере-растризация и память).

## 5) Как проверить, что улучшилось
- Instruments → Core Animation:
  - подсветка offscreen-rendered,
  - FPS,
  - GPU/Renderer stats.
- Профилировать именно во время скролла, потому что там эффект чаще всего заметен.

**Самопроверка**
- Оспорено: “cornerRadius всегда вызывает offscreen” — нет, ключевой триггер обычно клиппинг/маска; но комбинации могут зависеть от содержимого.
- Неочевидно: `shadowPath` — самый дешёвый и часто самый эффективный фикс; многие забывают и пытаются “оптимизировать” не там.
- Источники: Apple Core Animation performance guide, инструменты Core Animation в Instruments, практики оптимизации карточек (rounded corners + shadows).

### Q111 (🔴): Что такое runloop?

**Кратко**
- RunLoop — механизм, который держит поток “живым”, принимая и обрабатывая события: input sources (порты/сокеты/события), timers и observers.
- Он выполняет цикл: ждать → обработать → вызвать observers/timers → снова ждать.
- В iOS главный run loop (main thread) критичен для UI: touch, timers, layout/drawing и commit Core Animation завязаны на него.
- RunLoop имеет режимы (modes), из-за которых, например, Timer может “не тикать” при скролле, если он в `.default`.

**Развёрнуто**
## 1) Из чего состоит RunLoop (концептуально)
У Core Foundation это `CFRunLoop`, поверх которого есть `RunLoop` в Swift.
Внутри:
- **Input sources**:
  - Source0: “ручные” события (например, `performSelector`, custom signals),
  - Source1: событийные источники уровня ядра (mach ports и т.п.).
- **Timers**: `CFRunLoopTimer` / `Timer`.
- **Observers**: хуки на стадии цикла (before timers, before sources, before waiting, after waiting и т.д.).
- **Modes**: наборы источников/таймеров/обсерверов, активных в данном режиме.

## 2) Основной цикл (упрощённо)
1) notify observers (entry / before timers / before sources),
2) обработать source0/source1,
3) выполнить таймеры,
4) notify observers (before waiting),
5) sleep до нового события,
6) wake up, notify observers (after waiting),
7) repeat.

UIKit и Core Animation используют observers:
- например, commit транзакций CA часто привязан к стадии run loop.

## 3) Modes: почему это важно
- `.default` — обычный режим.
- `.tracking` — активен во время scroll/drag.
- `.common` — “набор общих режимов”.

Классический пример:
- Timer добавлен в `.default` → при скролле run loop в `.tracking` → Timer не firing.
Решение:
- добавить Timer в `.common`.

## 4) Зачем знать это senior’у
RunLoop объясняет:
- почему “UI завис” при тяжёлой работе на main,
- почему таймеры неточны,
- почему анимации и скролл дропают кадры,
- почему иногда помогают `.common` и правильное scheduling.

**Самопроверка**
- Оспорено: “RunLoop = просто бесконечный while(true)” — это структурированный event loop с источниками/таймерами/обсервером и режимами.
- Неочевидно: modes — реальная причина “таймер не работает при скролле”; понимание этого отличает опытного iOS dev.
- Источники: Apple docs RunLoop/CFRunLoop, Timer scheduling, Core Animation commit hooks, материалы по UI event loop.

### Q112 (🔴): Как работает Core Animation?

**Кратко**
- Core Animation — система, которая анимирует и композитит UI через **дерево слоёв (CALayer)**.
- UIKit в основном “настраивает” свойства слоёв, а Core Animation:
  - батчит изменения в транзакции,
  - интерполирует анимируемые свойства между кадрами,
  - рендерит и композитит кадры (часто вне main thread).
- Ключ: многие анимации происходят “на стороне рендера” и могут быть плавными даже при умеренной нагрузке main, пока main успевает коммитить транзакции.

**Развёрнуто**
## 1) Модель: UIView — это “обёртка” над CALayer
У каждой `UIView` есть `layer`.
Большая часть визуальных изменений — это изменения свойств слоя:
- position/bounds/transform,
- opacity,
- cornerRadius,
- shadow,
- contents (bitmap),
- sublayers.

Core Animation работает именно со слоями.

## 2) Batching и транзакции
Изменения слоя не рендерятся немедленно.
Они копятся в текущей `CATransaction` и коммитятся:
- обычно в конце итерации main run loop.

Ты можешь управлять транзакцией:
```swift
CATransaction.begin()
CATransaction.setAnimationDuration(0.3)
view.layer.opacity = 0.5
CATransaction.commit()
```

UIKit тоже использует транзакции под капотом (например, в `UIView.animate`).

## 3) Implicit vs explicit animations
### Implicit animations
Если ты меняешь layer property внутри анимируемого контекста:
- Core Animation создаёт implicit animation (CABasicAnimation) автоматически.
UIKit обычно “оборачивает” это в удобный API.

### Explicit animations
Ты сам создаёшь анимации:
- `CABasicAnimation`, `CAKeyframeAnimation`, `CAAnimationGroup`,
- добавляешь на layer через `add(_:forKey:)`.

## 4) Presentation vs model layer
У слоя есть:
- **model layer** — “целевое” состояние свойств,
- **presentation layer** — текущее интерполированное состояние во время анимации.

Это важно для:
- hit-testing во время анимации,
- получения текущего положения (например, для drag).
Ты можешь читать:
```swift
let current = view.layer.presentation()?.position
```

## 5) Rendering pipeline на высоком уровне
1) UIKit обновляет view/layer tree на main,
2) commit транзакций,
3) рендерер (часто на отдельном потоке/процессе) композитит слои,
4) GPU рисует итоговый кадр под vsync.

Если main thread не успевает:
- commit задерживается → dropped frames, лаги.

## 6) Что делает анимации “тяжёлыми”
- свойства, которые требуют перерисовки bitmap (например, изменения, которые триггерят `draw`),
- эффекты, вызывающие offscreen rendering,
- слишком много слоёв/overdraw.

Лучше анимируются:
- transform, opacity, position (обычно дешёвые, GPU-friendly).

**Самопроверка**
- Оспорено: “UIView.animate рисует кадры на main” — в основном нет: main готовит изменения и коммитит, а интерполяция/композитинг часто происходит на стороне Core Animation renderer.
- Неочевидно: model vs presentation layer — ключевой концепт, который объясняет “почему layer.position уже конечный, а визуально ещё движется”.
- Источники: Apple Core Animation Programming Guide, WWDC по rendering pipeline, docs CALayer/CATransaction/CAAnimation, материалы про presentationLayer.

### Q113 (🔴): Как работает display link?

**Кратко**
- `CADisplayLink` — таймер, синхронизированный с обновлением экрана (vsync). Он вызывает callback примерно один раз на кадр.
- Используется для:
  - кастомных анимаций,
  - игровых/физических циклов,
  - прогресс-анимаций, которые должны быть привязаны к кадрам.
- Он живёт в run loop и зависит от mode; callback приходит на поток, где добавлен (обычно main).
- В callback нужно делать минимум работы, иначе будут dropped frames.

**Развёрнуто**
## 1) Почему это не "обычный Timer"
`Timer` пытается срабатывать по расписанию, но:
- не синхронизирован с кадрами,
- может дрейфовать,
- и в любом случае будет задерживаться при загрузке main.

`CADisplayLink`:
- тикает под частоту дисплея,
- даёт ровный шаг для анимаций и обновлений, совпадающих с кадрами.

## 2) Как подключается
```swift
final class Animator {
    private var link: CADisplayLink?
    private var start: CFTimeInterval = 0

    func startAnimating() {
        let link = CADisplayLink(target: self, selector: #selector(step))
        link.add(to: .main, forMode: .common)
        self.link = link
    }

    func stopAnimating() {
        link?.invalidate()
        link = nil
    }

    @objc private func step(_ link: CADisplayLink) {
        if start == 0 { start = link.timestamp }
        let t = link.timestamp - start
        // обновить состояние
    }
}
```

## 3) Важные свойства
- `timestamp` — время текущего кадра (момент, когда начался текущий кадр).
- `targetTimestamp` — ожидаемое время следующего кадра; именно его лучше использовать для вычисления delta-time, чтобы анимация была максимально точной.
- `duration` — номинальная длительность кадра при текущей частоте; на устройствах с ProMotion (120Hz) частота динамически меняется, поэтому полагаться только на `duration` ненадёжно.
- `preferredFrameRateRange` (современный API) или `preferredFramesPerSecond` (устаревший) — настройка желаемой частоты.

## 4) Правильный расчёт delta-time
На ProMotion устройствах частота кадров может меняться динамически, поэтому анимация должна быть time-based, а не frame-based:
```swift
@objc private func step(_ link: CADisplayLink) {
    let dt = link.targetTimestamp - link.timestamp
    // использовать dt для обновления состояния
}
```

## 5) Run loop modes
Если добавить в `.default`, при скролле (`.tracking`) callback может не приходить.
Поэтому часто добавляют в `.common`.

## 6) Performance и корректность
- В `step` нельзя делать тяжёлые операции.
- Не забывать `invalidate()`, иначе display link удерживает target → утечка.

## 7) Когда не нужен display link
Если задача — обычная UI-анимация:
- `UIView.animate` / Core Animation обычно лучше (меньше кода, чаще эффективнее).
DisplayLink нужен, когда ты сам управляешь состоянием кадр-за-кадром.

**Самопроверка**
- Оспорено: "display link = точный таймер" — он синхронизирован с vsync, но всё равно зависит от загрузки main и режима run loop.
- Неочевидно: на ProMotion частота динамическая; для корректной анимации используй `targetTimestamp`, а не `duration` как единственный источник временного шага.
- Источники: Apple docs CADisplayLink, WWDC про rendering/vsync, практики time-based animation loops.

### Q114 (🔴): Как оптимизировать performance в UI?

**Кратко**
- Думай в терминах бюджета кадра (16.67ms при 60Hz, ~8.33ms при 120Hz): всё, что не укладывается → dropped frames.
- Основные направления оптимизации:
  1) разгрузить main thread (layout/работа с данными/декод изображений),
  2) снизить нагрузку на GPU (offscreen rendering, overdraw, слишком много слоёв),
  3) оптимизировать списки (reuse, self-sizing, prefetching, diffable/batching),
  4) уменьшить частоту обновлений (debounce/throttle, избегать лишних layout passes).

**Развёрнуто**
## 1) Найти, где узкое место: CPU или GPU
### Инструменты
- Instruments:
  - Time Profiler (CPU),
  - Core Animation (FPS, offscreen),
  - Allocations/Leaks (память),
  - System Trace (планировщик).
- Xcode:
  - Debug Memory Graph,
  - View Hierarchy.

Сначала измеряй, потом “лечи”.

## 2) Оптимизация main thread
- Убрать тяжёлые операции из main:
  - парсинг, I/O, image decode, большие вычисления.
- Не делать синхронную работу на main при скролле/анимациях.
- Меньше `layoutIfNeeded()` в горячих местах.
- Следить за количеством Auto Layout passes:
  - не пересоздавать constraints,
  - избегать глубоко вложенных stackView без необходимости.

## 3) Оптимизация GPU/рендера
- Минимизировать offscreen rendering:
  - `shadowPath` обязательно,
  - осторожно с `cornerRadius + masksToBounds`,
  - уменьшать blur area.
- Снижать overdraw:
  - избегать ненужных полупрозрачных слоёв,
  - не рисовать фон за фоном.
- Упростить иерархию слоёв:
  - меньше subviews/sublayers там, где можно.

## 4) Списки: таблицы/коллекции
- Reuse: конфигурация ячейки должна быть идемпотентной.
- Self-sizing:
  - хорошие estimates,
  - простые constraints,
  - кэш высот при необходимости.
- Prefetching:
  - подгрузка данных/картинок + cancel.
- Diffable:
  - стабильная identity,
  - не apply слишком часто.
- Избегать больших `reloadData`, когда можно обновить точечно.

## 5) Изображения
- Декодировать/ресайзить вне main (если библиотека/пайплайн позволяет).
- Кэшировать (memory/disk).
- Не грузить full-resolution изображения для маленьких превью.

## 6) Частота обновлений и события
- Debounce/throttle на search/scroll callbacks.
- Не обновлять UI, если состояние не изменилось (diff по модели).
- Избегать бесконечных layout/display invalidations.

## 7) Быстрые правила собеса
- “Сначала профилирую: Time Profiler + Core Animation.”
- “Смотрю main thread и GPU, проверяю offscreen и overdraw.”
- “Оптимизирую layout passes и списки: estimates, reuse, prefetch.”
- “Уношу тяжёлое из main, кэширую и уменьшаю площадь эффектов.”

**Самопроверка**
- Оспорено: “оптимизация = выключить тени/радиусы” — это частный случай; сначала нужно понять, CPU или GPU bottleneck и где именно.
- Неочевидно: главный враг плавности — не “медленный код вообще”, а код в неправильное время (во время скролла/анимации) и лишние invalidations.
- Источники: Instruments guides, Apple performance docs для UIKit/Core Animation, WWDC сессии про scrolling performance и rendering pipeline.

### Q115 (🔴): Как уменьшить лаги при скролле?

**Кратко**
- Лаги при скролле почти всегда из-за того, что на кадр приходится слишком много работы (CPU или GPU).
- Чек-лист:
  1) убрать тяжёлое из main в момент скролла (конфиг ячейки, парсинг, синхронные запросы),
  2) оптимизировать self-sizing (estimates, constraints),
  3) оптимизировать картинки (decode/resize/cache + cancel),
  4) снизить GPU cost (offscreen rendering, overdraw),
  5) уменьшить количество обновлений списка (diffable/batching, не делать reloadData часто).

**Развёрнуто**
## 1) Найти источник: CPU vs GPU
### CPU симптомы
- Time Profiler показывает большую загрузку main,
- много вызовов Auto Layout, text layout, image decoding, JSON parsing,
- “stutters” даже без визуально тяжёлых эффектов.

### GPU симптомы
- Core Animation инструмент показывает offscreen layers,
- много прозрачности/blur,
- тени/маски/радиусы в больших количествах.

## 2) Самые частые причины и фиксы (по убыванию встречаемости)
### A) Тяжёлая конфигурация ячейки
Причина:
- сложные вычисления в `cellForRowAt`/`willDisplay`,
- форматирование дат/чисел,
- вычисление размеров текста,
- синхронное чтение с диска.

Фиксы:
- перенос вычислений в background (или кэш результатов),
- заранее готовить ViewModel для ячейки,
- минимизировать работу в момент показа.

### B) Изображения
Причины:
- загрузка + декодирование в main,
- отсутствие кэша,
- отсутствие cancel на reuse.

Фиксы:
- использовать image pipeline с кэшем,
- cancel в `prepareForReuse`,
- downsampling под размер ячейки.

### C) Self-sizing и Auto Layout
Причины:
- плохие estimates,
- сложные constraints,
- nested stackView,
- пересоздание constraints на лету.

Фиксы:
- `estimatedRowHeight` близкий к реальности,
- упрощение constraints,
- кэширование высот (если контент не меняется),
- избегать `layoutIfNeeded` в scroll callbacks.

### D) Offscreen rendering (карточки)
Причины:
- `cornerRadius + masksToBounds` в каждой ячейке,
- shadows без `shadowPath`,
- blur на больших областях.

Фиксы:
- разделить shadow и clipping на разные вью,
- задать `shadowPath`,
- уменьшить blur/эффекты.

### E) Частые апдейты данных
Причины:
- `reloadData` слишком часто,
- частые apply snapshots без дебаунса,
- “перерисовывать всё” при маленьком изменении.

Фиксы:
- обновлять точечно (diffable snapshot, reloadItems),
- debounce (поиск/живые обновления),
- аккуратный batching.

## 3) Инструменты и практический процесс
- Instruments → Time Profiler: что грузит main во время скролла.
- Instruments → Core Animation: offscreen, FPS.
- “Points of Interest”/signposts (если используешь) — найти пики по времени.
- Делать изменения по одному и перепроверять.

## 4) Быстрый ответ на собесе
“Сначала профилирую: Time Profiler и Core Animation. Обычно виноваты: картинки (decode/cancel/cache), self-sizing (estimates/constraints), эффекты (offscreen shadows/masks), и слишком тяжёлая конфигурация ячеек. Оптимизирую: меньше работы на main, better estimates, shadowPath, split shadow/clipping, prefetch/cancel.”

**Самопроверка**
- Оспорено: “лаги = плохой телефон/слишком много элементов” — нет, чаще это неправильная работа на кадр (decode/Auto Layout/offscreen) и её можно исправить.
- Неочевидно: улучшение estimates часто даёт большой эффект без изменения UI, потому что снижает количество измерений и пересчётов contentSize.
- Источники: Instruments (Time Profiler/Core Animation), Apple guidelines по scrolling performance, best practices image pipelines и self-sizing.

### Q116 (🔴): Как работает drawing и rendering в UIKit?

**Кратко**
- UIKit разделяет “что нарисовать” и “как показать”:
  - layout рассчитывает geometry (frames),
  - drawing создаёт пиксели (bitmap) для слоёв, которым нужно рисование (`draw(_:)`, текст, изображения),
  - rendering/compositing (Core Animation) собирает слои в финальный кадр и отдаёт GPU.
- Изменения UI батчатся: UIKit обновляет layer tree на main, Core Animation коммитит транзакцию и рендерит кадр под vsync.
- Перфоманс упирается в:
  - CPU (layout + draw),
  - GPU (compositing, offscreen, overdraw).

**Развёрнуто**
## 1) Термины: layout / drawing / rendering
### Layout
- Auto Layout solver решает constraints → frames.
- `layoutSubviews` применяет геометрию и финальные настройки.

### Drawing (rasterization пикселей)
Когда вью/слой нуждается в “картинке” (bitmap):
- вызывается `draw(_:)` (если кастомный drawing),
- или происходит отрисовка текста/изображений.
Результат — backing store (bitmap) слоя (`CALayer.contents`).

### Rendering / Compositing
Core Animation:
- берёт набор слоёв (текстур),
- применяет transforms/opacity/z-order,
- делает эффекты (иногда offscreen),
- композитит финальный кадр.

## 2) Что происходит при изменениях UI (поток событий)
1) ты меняешь state (текст/constraints/alpha),
2) UIKit помечает layout/display как dirty,
3) в ближайший pass:
   - updateConstraints → solve → layoutSubviews,
   - затем draw (если нужно),
4) commit транзакции Core Animation,
5) renderer композитит кадр и отдаёт GPU.

## 3) Почему `draw(_:)` — это “дорого”
- Это CPU работа + запись в bitmap.
- Частый redraw (например, на скролле) быстро убивает fps.
Поэтому многие эффекты лучше делать через:
- `CALayer` свойства,
- `CAShapeLayer` (GPU-friendly),
- готовые изображения (если статично).

## 4) Где рвётся производительность
### CPU bottlenecks
- сложный Auto Layout (особенно self-sizing списки),
- текстовый layout и атрибуты,
- декодирование/ресайз изображений,
- частые `layoutIfNeeded`/`setNeedsDisplay`.

### GPU bottlenecks
- offscreen rendering (маски/тени/blur),
- overdraw (много прозрачных слоёв),
- слишком много слоёв.

## 5) Как “думать” про оптимизацию
- минимизировать layout passes,
- минимизировать redraw,
- делать анимации через transform/opacity,
- уменьшать offscreen и площадь эффектов,
- кэшировать результаты (но не вслепую).

**Самопроверка**
- Оспорено: “UIKit сам рисует всё на main” — main готовит state и иногда делает drawing, но финальный композит/рендер обычно на стороне Core Animation renderer/GPU.
- Неочевидно: drawing ≠ rendering; можно иметь быстрый drawing, но медленный GPU (offscreen), и наоборот.
- Источники: Apple docs UIKit rendering, Core Animation pipeline, WWDC про rendering performance и scrolling.

### Q117 (🔴): Как оптимизировать большой скроллящийся список (UITableView/UICollectionView): prefetching, diffable, self-sizing, reuse, batching?

**Кратко**
- Большой список оптимизируют по 5 осям:
  1) **Reuse**: ячейка конфигурируется полностью и дёшево, `prepareForReuse` сбрасывает/отменяет.
  2) **Self-sizing**: хорошие estimates + простые constraints, иначе измерения убьют CPU.
  3) **Prefetching**: заранее грузим данные/картинки и умеем отменять.
  4) **Updates**: diffable snapshots или правильный batching вместо частых `reloadData`.
  5) **Rendering**: меньше offscreen/overdraw в ячейках (shadows/masks/blur).
- Всегда начинать с профилирования: Time Profiler + Core Animation.

**Развёрнуто**
## 1) Reuse: сделать конфигурацию идемпотентной
- `configure(model:)` должен выставлять **все** состояния (text, hidden, alpha, image placeholder), не полагаясь на прошлое.
- В `prepareForReuse`:
  - сбросить transient state,
  - отменить async задачи (image download),
  - очистить ссылки на task/cancellable.

Паттерн:
- работа привязана к `model.id`, а не к “ячейке”.

## 2) Self-sizing: держать Auto Layout под контролем
- `UITableView.automaticDimension` → обязательно `estimatedRowHeight` близкий к реальности.
- В коллекции:
  - аккуратно с `estimated` в compositional/flow (самые частые источники лишних invalidations).
- Упростить constraints:
  - минимум вложенных `UIStackView`,
  - не пересоздавать constraints в `layoutSubviews`,
  - избегать expensive layout в `layoutSubviews`.

Если контент статичен:
- кэшировать вычисленные высоты (осознанно).

## 3) Prefetching: подготовка заранее + cancel
- Использовать `UITableViewDataSourcePrefetching` / `UICollectionViewDataSourcePrefetching`.
- Делать:
  - prefetch images/data,
  - cancel при смене направления.
- Дедупликация запросов и ограничение параллелизма, иначе prefetch может перегрузить сеть/CPU.

## 4) Updates: diffable vs batching vs reloadData
### Diffable
- Отлично для частых изменений данных:
  - безопасные анимации,
  - меньше риска “Invalid update”.
Критично:
- стабильная identity (`id`), Hashable не должен зависеть от изменяемых полей.
- не apply snapshot на каждый мелкий тик без debounce.

### Batching
- `performBatchUpdates`/`beginUpdates` для ручного управления,
- строго синхронизировать модель и операции insert/delete/move.

### `reloadData`
- самый грубый инструмент:
  - часто приводит к “дерганью” и сбросу состояний,
  - может быть дорогим на больших списках.
Использовать, когда реально нужно, но не как default.

## 5) Rendering: убираем GPU-убийц в ячейках
- Тени: всегда `shadowPath`.
- Радиусы: не сочетать “тень + masksToBounds” в одном слое → разделить на контейнеры.
- Минимизировать blur/маски и площадь прозрачности.
- Проверить offscreen в Instruments (Core Animation).

## 6) Изображения: пайплайн
- downsampling под размер ячейки,
- кэш (memory/disk),
- cancel на reuse,
- не декодить в main (если возможно).

## 7) Организация данных
- Подготовить view models заранее (например, форматированные строки, attributed text),
- не считать expensive stuff в `cellForItem/RowAt`.

**Самопроверка**
- Оспорено: “достаточно включить prefetching/diffable и будет быстро” — нет, узкие места часто в self-sizing, изображениях и offscreen rendering.
- Неочевидно: biggest win часто даёт не “новый API”, а дисциплина: idempotent configure, корректный cancel, хорошие estimates и shadowPath.
- Источники: Apple docs prefetching/diffable, WWDC про modern collection views, Instruments Core Animation/Time Profiler, best practices image pipelines.

### Q118 (🔴): Жизненный цикл UIViewController в контексте containment (child VC, presentation): где чаще всего ловят баги?

**Кратко**
- В containment ты отвечаешь за правильные вызовы:
  - `addChild` → добавить view → `didMove(toParent:)`,
  - `willMove(toParent:)` → убрать view → `removeFromParent`.
- Для presented VC важно понимать:
  - `viewWillAppear/DidAppear` и `viewWillDisappear/DidDisappear` зависят от presentation style (fullScreen vs pageSheet/overCurrentContext).
- Частые баги:
  - забыли `didMove`/`willMove`,
  - неправильный порядок добавления/удаления,
  - неверные Auto Layout constraints при добавлении child.view,
  - двойные подписки/утечки из-за lifecycle (подписались в willAppear, не отписались в willDisappear),
  - ожидание “underlying VC всегда получит disappear” — не всегда.

**Развёрнуто**
## 1) Containment: правила “контракта”
Правильное добавление child:
```swift
addChild(child)
view.addSubview(child.view)
child.view.frame = view.bounds // или constraints
child.didMove(toParent: self)
```

Правильное удаление:
```swift
child.willMove(toParent: nil)
child.view.removeFromSuperview()
child.removeFromParent()
```

Зачем это нужно:
- UIKit использует эти вызовы для корректного:
  - управления lifecycle,
  - передачи trait collection,
  - appearance callbacks,
  - event routing и responder chain нюансов.

Если пропустить шаги:
- “не приходят” appearance callbacks,
- child VC может остаться в неправильном состоянии.

## 2) Appearance callbacks и `beginAppearanceTransition`
UIKit автоматически вызывает `viewWillAppear/DidAppear` у child VC в контейнерах, но:
- в некоторых кастомных контейнерах (или сложных переходах) нужно ручное управление:
  - `beginAppearanceTransition` / `endAppearanceTransition`.
Типичный случай:
- ты делаешь кастомный transition между детьми без стандартного API.

Ошибки:
- забыли вызвать end → вечное “в transition” состояние.
- вызвали дважды → несогласованные callbacks.

## 3) Presentation styles: почему “не так вызывается”
### Full screen (`.fullScreen`)
Обычно:
- underlying VC получает `viewWillDisappear/DidDisappear`,
- presented получает `viewWillAppear/DidAppear`.

### Page sheet / form sheet (`.pageSheet`, `.formSheet`)
Underlying VC может **не** получить `viewDidDisappear` (он может оставаться “видимым” частично в иерархии), или вызовы будут отличаться от ожиданий.

### Over context (`.overCurrentContext`, `.overFullScreen`)
Underlying VC может не уходить “совсем”:
- появляются нюансы в appearance callbacks,
- особенно если presentation не закрывает полностью.

Следствие:
- код, который “останавливает таймеры/камеру в viewDidDisappear”, может не сработать в sheet/over styles.

## 4) Где ловят баги чаще всего
- Дублирование child.view:
  - добавили view, но не добавили child (или наоборот).
- Constraints:
  - забыли `translatesAutoresizingMaskIntoConstraints = false` и получили конфликт/не тот размер.
- Состояния:
  - не прокинули `additionalSafeAreaInsets`/traits, забыли `setNeedsStatusBarAppearanceUpdate`.
- Память:
  - parent удерживает child, child удерживает parent через closures/delegates.
- Подписки:
  - подписались на нотификации/наблюдения в willAppear, но не отписались → множится работа и утечки.

## 5) Практический ответ на собесе
“Я всегда соблюдаю контракт addChild/didMove и willMove/removeFromParent, иначе ломаются appearance callbacks. Для кастомных контейнеров слежу за begin/endAppearanceTransition. В presentations учитываю стиль: sheet/over контекст не гарантируют viewDidDisappear у underlying VC, поэтому жизненно важные стопы (камера/таймеры) часто лучше ставить в willDisappear и/или реагировать на notifications и scene lifecycle.”

**Самопроверка**
- Оспорено: “present всегда вызывает viewDidDisappear у underlying VC” — нет, зависит от presentation style (особенно sheets/over).
- Неочевидно: `beginAppearanceTransition/endAppearanceTransition` нужны редко, но именно там ловят самые неприятные баги в кастомных контейнерах.
- Источники: Apple docs View Controller Containment, UIViewController appearance callbacks, presentation styles (fullScreen/pageSheet/overCurrentContext).

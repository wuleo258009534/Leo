# 数据结构

lesson.json 使用 UTF-8。生成器验证后内嵌，不执行输入中的 HTML/JS。示例见 assets/example-lesson.json。

顶层必填：id（本课件唯一标识）、title、topics；badge 可选，默认“课堂讲评”。

Topic 必填：id、label（导航短标签）、title、blocks、questions。summary 为简要解题引导，materialLabel 为左区名称，可选。topic id 全局唯一，overview 保留。题型数量不限。

Question 必填：id（全局唯一）、number（原题号字符串）、prompt、answer（简短核对答案）、status（confirmed 或 unverified）。同号不同题型使用不同 id。可选：options（字符串数组，保留 A/B 等原标号）、answerKind（默认“答案”，开放题填“答案要点”）、evidence（同组材料块 id 数组）、approach（简短公开讲解切入）、steps（内容块数组）、pitfall（易错点）。不要求模型展示内部思维过程。

unverified 总览仅显示“待核验”；解析中 answer 标为“原提供答案（待核验）”。confirmed 不能空答案。长证明把结论放 answer，完整步骤放 steps。参考示例不可声称唯一答案。

## 内容块

材料 blocks 每块需有唯一 id；steps 中的块不需 id。label 可选。文本安全输出，支持换行，不自动渲染 Markdown/HTML/LaTeX。

- text：`{"id":"p1","type":"text","text":"题目条件"}`。
- image：`{"id":"fig1","type":"image","src":"figures/diagram.png","alt":"图形含义与必要条件","caption":"图1"}`。路径相对 JSON 目录，仅本地 PNG/JPEG/WebP，生成时内嵌。必须有 alt。
- table：`{"id":"data1","type":"table","headers":["时间/s","位移/m"],"rows":[["0","0"],["2","6"]]}`。每行列数一致；手机表格内部可横向滚动。

id 仅用 ASCII 字母数字、短横线、下划线。材料 text 中 `[[question-id]]` 生成可点按空格，显示原题号，引用同组题目 id。不要将显示题号作为全局主键。

生成器仅校验结构与引用；教学结论、OCR、图片和答案仍需制作者核验。

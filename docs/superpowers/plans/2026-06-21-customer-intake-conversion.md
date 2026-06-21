# Customer Intake Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the customer intake as a user-friendly refund self-check, move lead capture to the end, provide a fixed action-oriented result, and retain cautious legal wording.

**Architecture:** Keep the existing intake schema and analysis API intact. Restructure the React intake component and pass the selected scenario and goal into the result component for display; update only customer-facing layout, result composition, admin labels, and responsive styles.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, server-rendered markup tests, CSS

---

## File Structure

- Modify `components/intake-form.tsx`: new hero, applicability cards, reordered fields, customer contact section, disclaimer, and result context props.
- Modify `components/analysis-report.tsx`: fixed result hierarchy, numbered actions, focused consultation CTA, and empty-list handling.
- Modify `lib/site-config.ts`: update consultation button wording.
- Modify `components/case-table.tsx`: label stored contact data as customer contact.
- Modify `components/case-detail.tsx`: label stored contact data as customer contact.
- Modify `app/globals.css`: style applicability cards, lead-capture section, result steps, CTA, and disclaimer responsively.
- Create `tests/customer-intake.test.tsx`: rendered homepage wording, scenario list, field order, required contact, and disclaimer coverage.
- Modify `tests/analysis-report.test.tsx`: result hierarchy, scenario/goal, numbered actions, CTA, and hidden-CTA coverage.
- Modify `tests/case-detail.test.tsx`: updated customer-contact label.
- Modify `tests/case-workbench.test.ts`: customer-contact wording source check.

### Task 1: Customer-Friendly Hero, Applicability, and Form Order

**Files:**
- Create: `tests/customer-intake.test.tsx`
- Modify: `components/intake-form.tsx`

- [ ] **Step 1: Write the failing customer intake tests**

Render `IntakeForm` with `React.createElement` after making React available to the Vitest JSX runtime. Assert:

```ts
expect(html).toContain("退款纠纷自测");
expect(html).toContain("3分钟判断你的钱还能不能退");
expect(html).toContain("培训机构退费难");
expect(html).toContain("付款后服务未履行");
expect(html).toContain("您的联系方式");
expect(html).toContain("本工具仅基于用户填写信息生成初步参考");
expect(html.indexOf("纠纷类型")).toBeLessThan(html.indexOf("您的称呼"));
expect(html.indexOf("您的称呼")).toBeLessThan(html.indexOf("您的联系方式"));
expect(html).not.toContain("对方联系方式");
```

Inspect the rendered contact input and assert it has `required` and a customer-contact placeholder.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run tests/customer-intake.test.tsx`

Expected: FAIL because the current hero, scenario module, field labels, order, and disclaimer do not match.

- [ ] **Step 3: Implement the new landing and form sequence**

In `components/intake-form.tsx`:

- Add an `applicableSituations` array containing the six approved situations.
- Replace the current hero copy with the approved product name, title, and subtitle.
- Render a semantic `section` before `.layout-grid` with the six non-interactive situation cards.
- Move the existing `clientName` and `contact` labels to the end of the form, after `summary` and conditional detail fields.
- Rename the labels to `您的称呼` and `您的联系方式`.
- Use placeholder `手机号或微信号` and hint `仅用于案件记录和后续联系，不会展示在自测结果中。`.
- Add a lead-capture divider titled `最后一步：接收并保存你的自测记录`.
- Add the exact disclaimer in a page footer after the layout grid.
- Pass `scenario={form.scenario}` and `goal={form.goal}` to `AnalysisReport`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run tests/customer-intake.test.tsx`

Expected: all homepage structure tests pass.

- [ ] **Step 5: Commit the customer intake structure**

```bash
git add components/intake-form.tsx tests/customer-intake.test.tsx
git commit -m "Reframe customer refund intake"
```

### Task 2: Fixed Action-Oriented Result and Consultation CTA

**Files:**
- Modify: `tests/analysis-report.test.tsx`
- Modify: `components/analysis-report.tsx`
- Modify: `lib/site-config.ts`

- [ ] **Step 1: Rewrite result tests for the approved hierarchy**

Render `AnalysisReport` with `scenario="education"`, `goal="full_refund"`, and the existing sample result. Assert:

```ts
expect(html).toContain("你的纠纷情况");
expect(html).toContain("教培退费");
expect(html).toContain("全额退款");
expect(html).toContain("初步判断");
expect(html).toContain("你现在缺少的关键材料");
expect(html).toContain("第 1 步");
expect(html).toContain("领取你的专属材料清单");
expect(html).toContain("发送“退款自测”");
expect(html).toContain("添加微信领取清单");
expect(html.match(/添加微信领取清单/g)?.length).toBe(2);
expect(html).not.toContain("结果出来后建议尽快添加");
```

Keep the test that no consultation link is rendered when the environment URL is absent.

- [ ] **Step 2: Run the result test and verify RED**

Run: `npx vitest run tests/analysis-report.test.tsx`

Expected: FAIL because the current component lacks scenario and goal context, numbered steps, and the approved CTA.

- [ ] **Step 3: Implement the result hierarchy**

Update `AnalysisReportProps` to require `scenario` and `goal`. Use `getScenarioLabel`, `getGoalLabel`, and `getReviewFlagLabel` from `lib/schema.ts`.

Render results in this order:

1. A compact case-context card with scenario, goal, and review flag.
2. The approved consultation CTA when configured.
3. The emphasized summary card titled `初步判断`.
4. A materials card titled `你现在缺少的关键材料`.
5. An ordered step list that renders `第 ${index + 1} 步` beside each `next_steps` item.
6. Existing basis and risks in a two-column grid.
7. Existing communication advice.
8. A final consultation CTA with the same button label.

Replace `renderList` with a helper that returns a cautious fallback item for empty arrays. Remove `shouldShowConsultationPrompt`, `buildConsultationPrompt`, the inline CTA inside the judgment card, and the extra conditional consultation card.

Change `consultationLabel` in `lib/site-config.ts` to `添加微信领取清单`.

- [ ] **Step 4: Run result tests and verify GREEN**

Run: `npx vitest run tests/analysis-report.test.tsx`

Expected: all result structure and CTA tests pass.

- [ ] **Step 5: Commit the result redesign**

```bash
git add components/analysis-report.tsx lib/site-config.ts tests/analysis-report.test.tsx
git commit -m "Make refund results action oriented"
```

### Task 3: Customer Contact Labels in the Admin

**Files:**
- Modify: `tests/case-detail.test.tsx`
- Modify: `tests/case-workbench.test.ts`
- Modify: `components/case-detail.tsx`
- Modify: `components/case-table.tsx`

- [ ] **Step 1: Write failing admin wording tests**

Change the case detail assertion from `对方联系方式` to `客户联系方式`. Add a source-level assertion for `components/case-table.tsx` that requires the list metadata to include a visible `客户联系方式` label before the stored contact value.

- [ ] **Step 2: Run focused admin tests and verify RED**

Run: `npx vitest run tests/case-detail.test.tsx tests/case-workbench.test.ts`

Expected: FAIL because current admin wording still describes the merchant contact or shows an unlabeled number.

- [ ] **Step 3: Implement consistent admin labels**

In `CaseDetail`, replace `对方联系方式` with `客户联系方式`. In `CaseTable`, render `客户联系方式：${item.contact}` inside `.case-meta` while preserving scenario and list sorting behavior.

- [ ] **Step 4: Run focused admin tests and verify GREEN**

Run: `npx vitest run tests/case-detail.test.tsx tests/case-workbench.test.ts`

Expected: all focused admin tests pass.

- [ ] **Step 5: Commit the contact wording update**

```bash
git add components/case-detail.tsx components/case-table.tsx tests/case-detail.test.tsx tests/case-workbench.test.ts
git commit -m "Clarify customer contact labels"
```

### Task 4: Responsive Visual System

**Files:**
- Modify: `app/globals.css`
- Test: `tests/customer-intake.test.tsx`
- Test: `tests/analysis-report.test.tsx`

- [ ] **Step 1: Add failing CSS-contract assertions**

Read `app/globals.css` in the two UI test files and assert it contains dedicated selectors for `.applicability-grid`, `.lead-capture-section`, `.result-context`, `.action-steps`, `.conversion-card`, and `.legal-disclaimer`.

- [ ] **Step 2: Run UI tests and verify RED**

Run: `npx vitest run tests/customer-intake.test.tsx tests/analysis-report.test.tsx`

Expected: FAIL because the dedicated responsive selectors do not exist.

- [ ] **Step 3: Implement responsive styling**

Use the existing cream, forest, and warm-gold variables. Add:

- A three-column applicability grid on desktop and one column below 760px.
- A subtle patterned applicability panel distinct from the form.
- A bordered lead-capture section spanning both form columns.
- A compact result-context card and numbered step rows.
- One visually dominant warm conversion card with a full-width mobile button.
- A low-contrast but readable disclaimer footer.
- Mobile spacing that keeps all content inside a 390px viewport without horizontal overflow.

Remove CSS selectors that only supported deleted repeated consultation modules.

- [ ] **Step 4: Run UI and full verification**

Run: `npx vitest run tests/customer-intake.test.tsx tests/analysis-report.test.tsx`

Expected: focused tests pass.

Run: `npm test`

Expected: all project tests pass.

Run: `npm run lint`

Expected: no ESLint warnings or errors.

Run: `npm run build`

Expected: production build and standalone preparation complete successfully.

- [ ] **Step 5: Commit the visual system**

```bash
git add app/globals.css tests/customer-intake.test.tsx tests/analysis-report.test.tsx
git commit -m "Style refund self-check experience"
```

### Task 5: Deploy and Verify Public Behavior

**Files:**
- No tracked file changes expected

- [ ] **Step 1: Push the verified commits**

Push `main` to `origin` and wait for the matching Zeabur deployment to reach `运行中`.

- [ ] **Step 2: Verify desktop customer flow**

Open the public homepage and verify the approved title, six applicability items, reordered fields, customer-contact hint, disclaimer, and absence of horizontal overflow. Submit no production test case; use the existing automated API and rendering tests for data creation behavior.

- [ ] **Step 3: Verify an existing result rendering path locally**

Run the local application with a controlled test payload or component test evidence and verify the fixed result sections, numbered actions, and exactly two consultation buttons. Do not create fake customer records in the production database.

- [ ] **Step 4: Verify 390px mobile layout**

At a 390px viewport, verify the homepage and login-protected admin remain usable, applicability cards stack correctly, the form is single-column, and no horizontal overflow appears.

- [ ] **Step 5: Verify protected admin remains intact**

Confirm `/cases` still redirects unauthenticated visitors to `/admin/login`. After authentication, verify the case table and detail page use `客户联系方式` and no customer data appears on the public result page.

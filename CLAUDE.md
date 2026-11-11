# Muzakit — Claude Instructions

## Planning — OpenSpec

OpenSpec (`openspec/`) is the planning and spec system for **all** packages. Invoke its skills
automatically for any new feature or behaviour change — `openspec-explore` / `openspec-propose`
before code, `openspec-apply-change` while implementing, `openspec-archive-change` when done.
The trigger rule, its skip list and the flow are in `@.agents/claude/behavior.md`.

The superpowers `brainstorming` and `writing-plans` skills are **not used in this repo**. When
they would trigger, use `openspec-explore` / `openspec-propose` instead. This instruction outranks
the plugin's. All other superpowers skills (systematic-debugging, TDD,
verification-before-completion, …) remain in force.

## Instructions

@.agents/instructions/project.md
@.agents/instructions/conventions.md
@.agents/instructions/typescript.instructions.md
@.agents/instructions/vue-syntax.instructions.md
@.agents/instructions/composables.instructions.md
@.agents/instructions/workflow.md
@.agents/instructions/brainstorm-council.md
@.agents/instructions/ui-component-migration.md
@.agents/instructions/testing.md

## Agent Behavior

@.agents/claude/behavior.md

## Skills

@.agents/skills/use-api/SKILL.md
@.agents/skills/vtable/SKILL.md

Others are loaded on demand — see the Skills Reference in `.agents/claude/behavior.md`.

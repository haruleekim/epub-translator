<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();
</script>

<div class={props.class}>
	<button
		class="btn btn-block btn-soft btn-accent"
		onclick={async () => {
			const blob = await cx.project.exportEpub();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${cx.project.id}.epub`;
			a.click();
			URL.revokeObjectURL(url);
		}}
	>
		Export translated EPUB
	</button>

	<form
		class="mt-4"
		onsubmit={async (event) => {
			event.preventDefault();
			await cx.project.save();
		}}
	>
		<fieldset class="fieldset">
			<label class="contents">
				<span class="label">Default Prompt</span>
				<textarea
					class="textarea field-sizing-content w-full"
					spellcheck={false}
					bind:value={cx.project.defaultPrompt}
				></textarea>
			</label>
		</fieldset>

		<button
			type="submit"
			class="btn mt-2 flex btn-block btn-primary"
			disabled={!cx.project.dirty}
		>
			Confirm
		</button>
	</form>
</div>

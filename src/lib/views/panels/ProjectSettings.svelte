<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	let exportErrorMessage = $state<string>();
</script>

<div class={props.class}>
	<fieldset class="fieldset">
		<button
			class="btn btn-block btn-dash btn-accent"
			onclick={async () => {
				try {
					const blob = await cx.project.exportEpub();
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `${cx.project.id}.epub`;
					a.click();
					URL.revokeObjectURL(url);
				} catch (error) {
					exportErrorMessage = error instanceof Error ? error.message : String(error);
				}
			}}
		>
			Export translated EPUB
		</button>
		<p class="label text-xs text-error">{exportErrorMessage}</p>
	</fieldset>

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

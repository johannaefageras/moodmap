<script lang="ts">
	import { theme } from '$lib/stores/theme';
</script>

<button
	onclick={() => theme.toggle()}
	class="icon-box icon-box-md icon-box-hover text-base-content/60 hover:text-base-content transition-colors"
	aria-label={$theme === 'light' ? 'Byt till mörkt läge' : 'Byt till ljust läge'}
	title={$theme === 'light' ? 'Mörkt läge' : 'Ljust läge'}
>
	{#if $theme === 'light'}
		<i class="mi-moon icon-hover"></i>
	{:else}
		<i class="mi-sun icon-hover"></i>
	{/if}
</button>

<section class="container py-16 text-center md:py-24">
  <h1 class="heading-1">{{ $title }}</h1>
  <p class="mx-auto mt-4 max-w-2xl text-lead text-muted">{{ $subline }}</p>

  <div class="mt-8">
    <x-button-link :text="$button['text']" :url="$button['url']" :new-tab="$button['newTab']" />
  </div>
</section>

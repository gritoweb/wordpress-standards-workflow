@extends('layouts.app')

@section('content')
  {{-- Seam for the block framework's entrance system (stage 2, block
       framework PR): wrap this <section> with @entrance($entrance) and each
       child with @entrancePart(n) once App\Blocks\BlockEntrance ships. Until
       then it renders plainly, with no hidden state to flash. --}}
  <section class="container flex flex-1 flex-col items-center justify-center text-center">
    <p class="font-display text-[length:9.375rem] font-bold leading-none tracking-[-0.01em] xl:text-[length:18.75rem]"
      aria-hidden="true">404</p>
    <div class="flex w-full flex-col items-center gap-6">
      <h1 class="heading-3">{{ __('Page Not Found', '__TEXT_DOMAIN__') }}</h1>
      <p class="text-body xl:text-lead mt-0 max-w-[51rem]">
        {{ __('It looks like the page you’re looking for is no longer available or may have moved.', '__TEXT_DOMAIN__') }}<br>
        {{ __('Let’s get you back on track.', '__TEXT_DOMAIN__') }}
      </p>
      <a class="btn btn-primary w-full xl:w-auto" href="{!! esc_url(home_url('/')) !!}">
        {{ __('Return To Home', '__TEXT_DOMAIN__') }}
      </a>
    </div>
  </section>
@endsection

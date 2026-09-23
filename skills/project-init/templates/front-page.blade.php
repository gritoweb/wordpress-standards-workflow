{{-- The home is built from blocks and its hero carries the <h1>, so Sage's page-header is left out. --}}
@extends('layouts.app')

@section('content')
  @while (have_posts())
    @php(the_post())
    @php(the_content())
  @endwhile
@endsection

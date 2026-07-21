from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Default paging, but callers can ask for more with ?page_size=…

    Without page_size_query_param DRF silently ignores ?page_size, which meant
    lists like products/accounts were capped at 20 rows.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 2000

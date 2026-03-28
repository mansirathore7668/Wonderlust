// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  const url = new URL(window.location.href)
  if (url.searchParams.get('welcome') === '1') {
    url.searchParams.delete('welcome')
    const nextSearch = url.searchParams.toString()
    window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`)
  }

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    if (form.dataset.disableValidation === 'true') {
      return
    }
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

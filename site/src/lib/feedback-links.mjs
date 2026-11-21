import { feedbackIssueUrl, pageUrlForFeedback } from './reader-feedback.mjs';

export function bindFeedbackLinks(doc = document, view = window) {
  const links = [...doc.querySelectorAll('[data-feedback-link]')];
  const apply = () => {
    const page = pageUrlForFeedback(view.location.href, view.location.origin);
    const href = feedbackIssueUrl(page);
    for (const link of links) link.setAttribute('href', href);
  };
  apply();
  view.addEventListener('popstate', apply);
  for (const link of links) {
    link.addEventListener('pointerdown', apply);
    link.addEventListener('focus', apply);
  }
  return () => {
    view.removeEventListener('popstate', apply);
    for (const link of links) {
      link.removeEventListener('pointerdown', apply);
      link.removeEventListener('focus', apply);
    }
  };
}

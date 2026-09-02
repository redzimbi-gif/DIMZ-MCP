"use client";

import { useRef, type ReactNode } from "react";

/**
 * Comme <form>, mais se vide après un enregistrement réussi au lieu de
 * garder les valeurs saisies — pour les formulaires "ajouter" (champs sans
 * defaultValue) qu'on ré-utilise plusieurs fois de suite pour alimenter une
 * liste. Ne pas utiliser sur un formulaire d'édition (defaultValue liée à
 * une donnée existante) : reset() reviendrait à l'état initial, pas à la
 * valeur qu'on vient d'enregistrer.
 */
export function AutoResetForm({
  action,
  children,
  className,
  encType,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
  encType?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} className={className} encType={encType} action={handleAction}>
      {children}
    </form>
  );
}

import { account } from './account';
import { auth } from './auth';
import { catalog } from './catalog';
import { common } from './common';
import { access, home } from './home';
import { onboarding } from './onboarding';
import { profile } from './profile';
import { reader } from './reader';
import { admin } from './admin';
import { adminLibrary } from './adminLibrary';
import { adminPeople } from './adminPeople';
import { services } from './services';
import { push, status, tabs } from './status';

/**
 * The English copy — the source of truth. Every other language is typed
 * against this object, so a string added here without its translations is
 * a compile error, and one removed here takes its translations with it.
 */
export const en = {
  common,
  auth,
  onboarding,
  home,
  access,
  catalog,
  reader,
  profile,
  account,
  status,
  tabs,
  push,
  services,
  admin,
  adminLibrary,
  adminPeople,
};

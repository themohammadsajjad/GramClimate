import { chatGPTSignInPath } from '../chatgpt-auth';
import { getAppUser } from '../account-auth';
import Welcome from './welcome';
export const dynamic = 'force-dynamic';
export default async function Login() {
  const user = await getAppUser();
  return <Welcome signedIn={!!user} signInUrl={chatGPTSignInPath('/')} />;
}

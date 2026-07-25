/**
 * Entry point. Remotion loads this file, which registers the compositions.
 * Nothing else should live here.
 */
import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);

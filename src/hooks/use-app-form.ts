import { createFormHook } from '@tanstack/react-form'

import {
  Select,
  SubscribeButton,
  TextArea,
  TextField,
  RadioGroupField,
} from '../components/form-components'
import { fieldContext, formContext } from './form-context'

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    Select,
    TextArea,
    RadioGroupField,
  },
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
})

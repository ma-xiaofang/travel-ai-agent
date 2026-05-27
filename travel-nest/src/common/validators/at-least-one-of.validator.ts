import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/** 校验对象上至少有一个字段非空 */
@ValidatorConstraint({ name: 'atLeastOneOf', async: false })
export class AtLeastOneOfConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const fields = args.constraints[0] as string[];
    const obj = args.object as Record<string, unknown>;
    return fields.some((field) => {
      const v = obj[field];
      return v !== undefined && v !== null && v !== '';
    });
  }

  defaultMessage(args: ValidationArguments): string {
    const fields = (args.constraints[0] as string[]).join('、');
    return `${fields}至少填写一个`;
  }
}

/** 类或属性装饰器：fields 中至少一个必填 */
export function AtLeastOneOf(
  fields: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [fields],
      validator: AtLeastOneOfConstraint,
    });
  };
}
